const ComprovanteRepository = require('../repositories/ComprovanteRepository');
const CategoriaRepository = require('../repositories/CategoriaRepository');
const ArmazenamentoService = require('./ArmazenamentoService');
const iaService = require('./iaService');
const UsoIAService = require('./UsoIAService');

const NOME_CATEGORIA_PADRAO = 'Outros';

// categoriaId é uma coluna UUID (Categoria.js); validar o formato antes de
// consultar o banco evita erro de cast de tipo no Postgres (ali um valor fora
// do formato lançaria exceção em vez de simplesmente não encontrar nada).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAMPOS_EDITAVEIS = [
  'estabelecimento',
  'data',
  'valor',
  'categoriaId',
  'observacoes',
];

const CAMPOS_CRIACAO = [
  ...CAMPOS_EDITAVEIS,
  'imagemUrl',
];

function criarErro(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}


async function buscarDoUsuario(id, usuarioId) {
  const comprovante = await ComprovanteRepository.findById(id);

  if (!comprovante) {
    throw criarErro(404, 'Comprovante não encontrado.');
  }

  if (String(comprovante.usuarioId) !== String(usuarioId)) {
    throw criarErro(
      403,
      'Você não tem permissão para acessar este comprovante.'
    );
  }

  return comprovante;
}

const ComprovanteService = {
  async criar(usuarioId, body) {
    const dados = validarEPrepararCampos(body, {
      camposPermitidos: CAMPOS_CRIACAO,
      criacao: true,
    });

    const categoria = await CategoriaRepository.findById(dados.categoriaId);
    if (!categoria) {
      throw criarErro(400, 'A categoria informada não existe.');
    }

    const comprovante = await ComprovanteRepository.create({
      ...dados,
      usuarioId,
    });

    return serializarComprovante(comprovante);
  },

  // cria o comprovante a partir da foto: a ia lê a imagem e devolve os dados
  async criarComIA(usuarioId, arquivo) {
    // pega as categorias do usuário pra ia escolher uma
    const categorias = await CategoriaRepository.findAllByUsuario(usuarioId);

    // o iaService preenche uma entrada por chamada ao provedor, inclusive as que
    // falham, para gravar o uso de tokens (seção 9 das regras)
    const tentativas = [];

    // manda a imagem pra ia (se ilegível ou fora do ar, o erro para aqui)
    let analise;
    try {
      analise = await iaService.analisarComprovante(
        arquivo.buffer,
        arquivo.mimetype,
        categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome })),
        { tentativas }
      );
    } catch (erro) {
      // 422 ou 503: nenhum comprovante foi criado, mas as tentativas gastaram tokens
      await UsoIAService.registrarTentativas(usuarioId, tentativas);
      throw erro;
    }

    let imagemUrl;
    let comprovante;
    try {
      // confere a categoria da ia, se inválida usa "Outros"
      const categoriaId = resolverCategoria(categorias, analise.categoriaId);
      const camposNormalizados = normalizarCamposDaIA(analise);

      // salva a imagem no disco e depois o comprovante no banco
      imagemUrl = await ArmazenamentoService.salvar(arquivo.buffer, arquivo.mimetype);

      comprovante = await ComprovanteRepository.create({
        ...camposNormalizados,
        categoriaId,
        imagemUrl,
        usuarioId,
      });
    } catch (erro) {
      // se falhar ao salvar no banco, apaga a imagem pra não ficar solta
      if (imagemUrl) {
        await ArmazenamentoService.remover(imagemUrl);
      }
      await UsoIAService.registrarTentativas(usuarioId, tentativas);
      throw erro;
    }

    // liga o comprovante criado à tentativa que o gerou; falha ao gravar o uso
    // só vai para o log e não desfaz o comprovante
    await UsoIAService.registrarTentativas(usuarioId, tentativas, comprovante.id);

    return serializarComprovante(comprovante);
  },

  async listar(usuarioId, query = {}) {
    const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
    const limiteSolicitado = query.limite === undefined
      ? 20
      : Number(query.limite);

    if (!Number.isInteger(pagina) || pagina < 1
      || !Number.isInteger(limiteSolicitado) || limiteSolicitado < 1) {
      throw criarErro(400, 'Paginação inválida.');
    }

    const limite = Math.min(limiteSolicitado, 100);
    const categoriaId = await validarCategoriaIdDoFiltro(query.categoriaId, usuarioId);
    const busca = validarBusca(query.busca);

    const comprovantes = await ComprovanteRepository.findAllByUsuario(usuarioId, {
      limite,
      offset: (pagina - 1) * limite,
      categoriaId,
      busca,
    });

    return comprovantes.map(serializarComprovante);
  },

  async resumo(usuarioId, query = {}) {
    const mes = validarMes(query.mes);
    const comprovantes = await ComprovanteRepository.findAllByUsuarioComCategoria(usuarioId);
    const doMes = comprovantes.filter((comprovante) => mesDoComprovante(comprovante) === mes);

    const porCategoriaMap = new Map();
    let total = 0;

    for (const comprovante of doMes) {
      const categoriaId = comprovante.categoriaId;

      if (!porCategoriaMap.has(categoriaId)) {
        porCategoriaMap.set(categoriaId, {
          categoriaId,
          nome: comprovante.categoria ? comprovante.categoria.nome : null,
          total: 0,
          quantidade: 0,
        });
      }

      const grupo = porCategoriaMap.get(categoriaId);
      grupo.quantidade += 1;

      if (comprovante.valor !== null && comprovante.valor !== undefined) {
        const valor = Number(comprovante.valor);
        total += valor;
        grupo.total += valor;
      }
    }

    const porCategoria = Array.from(porCategoriaMap.values())
      .map((grupo) => ({ ...grupo, total: arredondar(grupo.total) }))
      .sort((a, b) => b.total - a.total);

    return {
      mes,
      total: arredondar(total),
      quantidade: doMes.length,
      porCategoria,
    };
  },

  async detalhar(id, usuarioId) {
    const comprovante = await buscarDoUsuario(id, usuarioId);
    return serializarComprovante(comprovante);
  },

  async obterImagem(id, usuarioId) {
    const comprovante = await buscarDoUsuario(id, usuarioId);
    const arquivo = await ArmazenamentoService.obterArquivo(comprovante.imagemUrl);

    if (!arquivo) {
      throw criarErro(404, 'Imagem do comprovante não encontrada.');
    }

    return arquivo;
  },

  async editar(id, usuarioId, body) {
    const comprovante = await buscarDoUsuario(id, usuarioId);
    const dados = validarEPrepararCampos(body, {
      camposPermitidos: CAMPOS_EDITAVEIS,
    });

    if (Object.prototype.hasOwnProperty.call(dados, 'categoriaId')) {
      const categoria = await CategoriaRepository.findById(dados.categoriaId);
      if (!categoria) {
        throw criarErro(400, 'A categoria informada não existe.');
      }
    }

    await comprovante.update(dados);
    return serializarComprovante(comprovante);
  },

  async excluir(id, usuarioId) {
    const comprovante = await buscarDoUsuario(id, usuarioId);
    await comprovante.destroy();
    // depois de apagar o registro, apaga a imagem do disco
    await ArmazenamentoService.remover(comprovante.imagemUrl);
  },
};

function serializarComprovante(comprovante) {
  const dados = comprovante && typeof comprovante.toJSON === 'function'
    ? comprovante.toJSON()
    : { ...comprovante };

  // não mostra o caminho interno da imagem pro cliente
  delete dados.imagemUrl;
  return dados;
}

function dataAtualEmFortaleza() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obter = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

async function validarCategoriaIdDoFiltro(categoriaId, usuarioId) {
  if (categoriaId === undefined) {
    return undefined;
  }

  if (typeof categoriaId !== 'string' || !UUID_REGEX.test(categoriaId.trim())) {
    throw criarErro(400, 'categoriaId deve identificar uma categoria válida.');
  }

  const categoriaIdTrim = categoriaId.trim();
  const categoria = await CategoriaRepository.findByIdAndUsuario(categoriaIdTrim, usuarioId);
  if (!categoria) {
    throw criarErro(400, 'A categoria informada não existe ou não pertence ao usuário.');
  }

  return categoriaIdTrim;
}

function validarBusca(busca) {
  if (busca === undefined) {
    return undefined;
  }

  if (typeof busca !== 'string') {
    throw criarErro(400, 'busca deve ser uma string.');
  }

  const buscaTrim = busca.trim();
  if (buscaTrim.length > 100) {
    throw criarErro(400, 'busca deve ter no máximo 100 caracteres.');
  }

  return buscaTrim || undefined;
}

function mesDeDataHora(data) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(data);

  const obter = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${obter('year')}-${obter('month')}`;
}

function mesAtualEmFortaleza() {
  return mesDeDataHora(new Date());
}

function mesDoComprovante(comprovante) {
  return comprovante.data
    ? comprovante.data.slice(0, 7)
    : mesDeDataHora(comprovante.createdAt);
}

function validarMes(mes) {
  if (mes === undefined) {
    return mesAtualEmFortaleza();
  }

  if (typeof mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw criarErro(400, 'mes deve estar no formato YYYY-MM.');
  }

  if (mes > mesAtualEmFortaleza()) {
    throw criarErro(400, 'mes não pode ser futuro.');
  }

  return mes;
}

function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function dataEhValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  const existeNoCalendario = dataUtc.getUTCFullYear() === ano
    && dataUtc.getUTCMonth() === mes - 1
    && dataUtc.getUTCDate() === dia;

  return existeNoCalendario && data <= dataAtualEmFortaleza();
}

// se a ia errou a categoria, cai em "Outros"
function resolverCategoria(categorias, categoriaIdSugerido) {
  const categoriaValida = categorias.find(
    (categoria) => categoria.id === categoriaIdSugerido
  );

  if (categoriaValida) {
    return categoriaValida.id;
  }

  const categoriaPadrao = categorias.find(
    (categoria) => categoria.nome === NOME_CATEGORIA_PADRAO
  );

  if (!categoriaPadrao) {
    throw criarErro(
      500,
      'Categoria padrão "Outros" não encontrada para o usuário.'
    );
  }

  return categoriaPadrao.id;
}

function normalizarCamposDaIA(analise) {
  // campo inválido vindo da ia vira null, não bloqueia a criação
  const estabelecimento = typeof analise.estabelecimento === 'string'
    ? analise.estabelecimento.trim()
    : null;

  return {
    estabelecimento: estabelecimento && estabelecimento.length <= 150
      ? estabelecimento
      : null,
    data: dataEhValida(analise.data) ? analise.data : null,
    valor: valorEhValido(analise.valor) ? analise.valor : null,
  };
}

function valorEhValido(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return false;
  }

  if (valor <= 0 || valor > 9999999.99) {
    return false;
  }

  const valorEmCentavos = valor * 100;
  return Math.abs(valorEmCentavos - Math.round(valorEmCentavos)) < 1e-8;
}

function validarEPrepararCampos(body, opcoes = {}) {
  const {
    camposPermitidos = CAMPOS_EDITAVEIS,
    criacao = false,
  } = opcoes;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw criarErro(400, 'O corpo da requisição deve ser um objeto JSON.');
  }

  const camposEnviados = Object.keys(body);
  if (!criacao && camposEnviados.length === 0) {
    throw criarErro(400, 'Envie ao menos um campo para editar.');
  }

  if (camposEnviados.some((campo) => !camposPermitidos.includes(campo))) {
    throw criarErro(
      400,
      criacao
        ? 'Só é permitido informar estabelecimento, data, valor, categoriaId, imagemUrl e observacoes.'
        : 'Só é permitido editar estabelecimento, data, valor, categoriaId e observacoes.'
    );
  }

  const dados = {};

  if (Object.prototype.hasOwnProperty.call(body, 'estabelecimento')) {
    if (body.estabelecimento !== null && typeof body.estabelecimento !== 'string') {
      throw criarErro(400, 'Estabelecimento deve ser uma string ou null.');
    }

    if (typeof body.estabelecimento === 'string') {
      const estabelecimento = body.estabelecimento.trim();
      if (estabelecimento.length > 150) {
        throw criarErro(
          400,
          'Estabelecimento deve ter no máximo 150 caracteres.'
        );
      }
      dados.estabelecimento = estabelecimento || null;
    } else {
      dados.estabelecimento = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'observacoes')) {
    if (body.observacoes !== null && typeof body.observacoes !== 'string') {
      throw criarErro(400, 'Observações deve ser uma string ou null.');
    }

    if (typeof body.observacoes === 'string') {
      const observacoes = body.observacoes.trim();
      if (observacoes.length > 500) {
        throw criarErro(400, 'Observações deve ter no máximo 500 caracteres.');
      }
      dados.observacoes = observacoes || null;
    } else {
      dados.observacoes = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'data')) {
    if (body.data !== null && !dataEhValida(body.data)) {
      throw criarErro(
        400,
        'Data deve ser válida, no formato YYYY-MM-DD, e não pode ser futura.'
      );
    }
    dados.data = body.data;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'valor')) {
    if (body.valor !== null && !valorEhValido(body.valor)) {
      throw criarErro(
        400,
        'Valor deve ser um número maior que zero, de até 9999999.99 e com no máximo duas casas decimais.'
      );
    }
    dados.valor = body.valor;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'categoriaId')) {
    if (typeof body.categoriaId !== 'string' || body.categoriaId.trim() === '') {
      throw criarErro(400, 'categoriaId deve identificar uma categoria válida.');
    }
    dados.categoriaId = body.categoriaId.trim();
  } else if (criacao) {
    throw criarErro(400, 'categoriaId é obrigatório.');
  }

  if (criacao) {
    if (typeof body.imagemUrl !== 'string' || body.imagemUrl.trim() === '') {
      throw criarErro(400, 'imagemUrl é obrigatória e deve ser uma string válida.');
    }
    dados.imagemUrl = body.imagemUrl.trim();
  }

  return dados;
}
module.exports = ComprovanteService;
