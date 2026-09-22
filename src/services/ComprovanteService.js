const ComprovanteRepository = require('../repositories/ComprovanteRepository');
const CategoriaRepository = require('../repositories/CategoriaRepository');
const ArmazenamentoService = require('./ArmazenamentoService');
const geminiService = require('./geminiService');

const NOME_CATEGORIA_PADRAO = 'Outros';

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

  async criarComIA(usuarioId, arquivo) {
    const categorias = await CategoriaRepository.findAllByUsuario(usuarioId);

    const analise = await geminiService.analisarComprovante(
      arquivo.buffer,
      arquivo.mimetype,
      categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome }))
    );

    const categoriaId = resolverCategoria(categorias, analise.categoriaId);
    const camposNormalizados = normalizarCamposDaIA(analise);

    const imagemUrl = await ArmazenamentoService.salvar(
      arquivo.buffer,
      arquivo.mimetype
    );

    try {
      const comprovante = await ComprovanteRepository.create({
        ...camposNormalizados,
        categoriaId,
        imagemUrl,
        usuarioId,
      });

      return serializarComprovante(comprovante);
    } catch (erro) {
      // A imagem não pode ficar órfã se o comprovante não for criado.
      await ArmazenamentoService.remover(imagemUrl);
      throw erro;
    }
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
    const comprovantes = await ComprovanteRepository.findAllByUsuario(usuarioId, {
      limite,
      offset: (pagina - 1) * limite,
    });

    return comprovantes.map(serializarComprovante);
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
  },
};

function serializarComprovante(comprovante) {
  const dados = comprovante && typeof comprovante.toJSON === 'function'
    ? comprovante.toJSON()
    : { ...comprovante };

  // A referência interna do armazenamento não deve ser exposta ao cliente.
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
  // Campos inválidos extraídos pela IA nunca bloqueiam a criação: viram null
  // e preservam os demais dados válidos (REGRAS-DE-NEGOCIO.md, seção 4).
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
