jest.mock('../../models', () => ({
  Comprovante: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Categoria: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../geminiService');
jest.mock('../ArmazenamentoService');

const { Comprovante, Categoria } = require('../../models');
const geminiService = require('../geminiService');
const ArmazenamentoService = require('../ArmazenamentoService');
const ComprovanteService = require('../ComprovanteService');

describe('ComprovanteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('criar usa o usuário autenticado, valida a categoria global e retorna o comprovante', async () => {
    Categoria.findByPk.mockResolvedValueOnce({ id: 'categoria-1' });
    Comprovante.create.mockResolvedValueOnce({
      id: 'comprovante-1',
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'usuario-1',
    });

    const resultado = await ComprovanteService.criar('usuario-1', {
      estabelecimento: '  Mercado Central  ',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: ' categoria-1 ',
      imagemUrl: ' /interno/comprovante.jpg ',
    });

    expect(Categoria.findByPk).toHaveBeenCalledWith('categoria-1');
    expect(Comprovante.create).toHaveBeenCalledWith({
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'usuario-1',
    });
    expect(resultado).toEqual({
      id: 'comprovante-1',
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'categoria-1',
      usuarioId: 'usuario-1',
    });
  });

  test('criar permite estabelecimento, data e valor nulos', async () => {
    Categoria.findByPk.mockResolvedValueOnce({ id: 'categoria-outros' });
    Comprovante.create.mockResolvedValueOnce({
      id: 'comprovante-1',
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: 'categoria-outros',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'usuario-1',
    });

    await ComprovanteService.criar('usuario-1', {
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: 'categoria-outros',
      imagemUrl: '/interno/comprovante.jpg',
    });

    expect(Comprovante.create).toHaveBeenCalledWith({
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: 'categoria-outros',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'usuario-1',
    });
  });

  test('criar aceita observacoes com trim e normaliza vazio para null', async () => {
    Categoria.findByPk.mockResolvedValueOnce({ id: 'categoria-1' });
    Comprovante.create.mockResolvedValueOnce({
      id: 'comprovante-1',
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'usuario-1',
      observacoes: 'Compra de material',
    });

    await ComprovanteService.criar('usuario-1', {
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      observacoes: '  Compra de material  ',
    });

    expect(Comprovante.create).toHaveBeenCalledWith(
      expect.objectContaining({ observacoes: 'Compra de material' })
    );
  });

  test('criar normaliza observacoes vazia ou só espaços para null', async () => {
    Categoria.findByPk.mockResolvedValueOnce({ id: 'categoria-1' });
    Comprovante.create.mockResolvedValueOnce({
      id: 'comprovante-1',
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'usuario-1',
      observacoes: null,
    });

    await ComprovanteService.criar('usuario-1', {
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      observacoes: '   ',
    });

    expect(Comprovante.create).toHaveBeenCalledWith(
      expect.objectContaining({ observacoes: null })
    );
  });

  test('criar rejeita observacoes que não seja string ou null', async () => {
    await expect(
      ComprovanteService.criar('usuario-1', {
        categoriaId: 'categoria-1',
        imagemUrl: '/interno/comprovante.jpg',
        observacoes: 123,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Observações deve ser uma string ou null.',
    });
    expect(Comprovante.create).not.toHaveBeenCalled();
  });

  test.each([
    ['imagem ausente', {
      categoriaId: 'categoria-1',
    }, 'imagemUrl é obrigatória e deve ser uma string válida.'],
    ['categoria ausente', {
      imagemUrl: '/interno/comprovante.jpg',
    }, 'categoriaId é obrigatório.'],
    ['estabelecimento longo', {
      estabelecimento: 'A'.repeat(151),
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
    }, 'Estabelecimento deve ter no máximo 150 caracteres.'],
    ['data futura', {
      data: '2999-01-01',
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
    }, 'Data deve ser válida, no formato YYYY-MM-DD, e não pode ser futura.'],
    ['valor inválido', {
      valor: 0,
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
    }, 'Valor deve ser um número maior que zero, de até 9999999.99 e com no máximo duas casas decimais.'],
    ['usuarioId enviado no corpo', {
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
      usuarioId: 'outro-usuario',
    }, 'Só é permitido informar estabelecimento, data, valor, categoriaId, imagemUrl e observacoes.'],
  ])('criar rejeita %s com 400', async (_caso, body, mensagem) => {
    await expect(
      ComprovanteService.criar('usuario-1', body)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: mensagem,
    });
    expect(Comprovante.create).not.toHaveBeenCalled();
  });

  test('criar rejeita categoria inexistente com 400', async () => {
    Categoria.findByPk.mockResolvedValueOnce(null);

    await expect(
      ComprovanteService.criar('usuario-1', {
        categoriaId: 'categoria-inexistente',
        imagemUrl: '/interno/comprovante.jpg',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'A categoria informada não existe.',
    });
    expect(Comprovante.create).not.toHaveBeenCalled();
  });

  describe('obterImagem', () => {
    test('retorna caminho e mimetype quando comprovante e arquivo existem', async () => {
      Comprovante.findByPk.mockResolvedValueOnce({
        id: 'comprovante-1',
        usuarioId: 'usuario-1',
        imagemUrl: 'uploads/foto.jpg',
      });
      ArmazenamentoService.obterArquivo.mockResolvedValueOnce({
        caminhoCompleto: '/abs/path/uploads/foto.jpg',
        mimeType: 'image/jpeg',
      });

      const resultado = await ComprovanteService.obterImagem('comprovante-1', 'usuario-1');

      expect(ArmazenamentoService.obterArquivo).toHaveBeenCalledWith('uploads/foto.jpg');
      expect(resultado).toEqual({
        caminhoCompleto: '/abs/path/uploads/foto.jpg',
        mimeType: 'image/jpeg',
      });
    });

    test('rejeita com 404 se o comprovante não existir', async () => {
      Comprovante.findByPk.mockResolvedValueOnce(null);

      await expect(
        ComprovanteService.obterImagem('inexistente', 'usuario-1')
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(ArmazenamentoService.obterArquivo).not.toHaveBeenCalled();
    });

    test('rejeita com 403 se o comprovante pertencer a outro usuário', async () => {
      Comprovante.findByPk.mockResolvedValueOnce({
        id: 'comprovante-1',
        usuarioId: 'outro-usuario',
        imagemUrl: 'uploads/foto.jpg',
      });

      await expect(
        ComprovanteService.obterImagem('comprovante-1', 'usuario-1')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(ArmazenamentoService.obterArquivo).not.toHaveBeenCalled();
    });

    test('rejeita com 404 se o arquivo físico não existir mais', async () => {
      Comprovante.findByPk.mockResolvedValueOnce({
        id: 'comprovante-1',
        usuarioId: 'usuario-1',
        imagemUrl: 'uploads/removido.jpg',
      });
      ArmazenamentoService.obterArquivo.mockResolvedValueOnce(null);

      await expect(
        ComprovanteService.obterImagem('comprovante-1', 'usuario-1')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Imagem do comprovante não encontrada.',
      });
    });
  });

  describe('criarComIA', () => {
    const categoriasDoUsuario = [
      { id: 'cat-material', nome: 'Material' },
      { id: 'cat-outros', nome: 'Outros' },
    ];
    const arquivo = {
      buffer: Buffer.from('imagem-fake'),
      mimetype: 'image/jpeg',
    };

    test('busca as categorias do usuário e envia apenas id/nome ao Gemini', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: 'Mercado',
        data: '2026-09-14',
        valor: 10,
        categoriaId: 'cat-material',
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/arquivo.jpg');
      Comprovante.create.mockResolvedValueOnce({
        id: 'comprovante-1',
        estabelecimento: 'Mercado',
        data: '2026-09-14',
        valor: 10,
        categoriaId: 'cat-material',
        imagemUrl: 'uploads/arquivo.jpg',
        usuarioId: 'usuario-1',
      });

      await ComprovanteService.criarComIA('usuario-1', arquivo);

      expect(Categoria.findAll).toHaveBeenCalledWith({ where: { usuarioId: 'usuario-1' } });
      expect(geminiService.analisarComprovante).toHaveBeenCalledWith(
        arquivo.buffer,
        arquivo.mimetype,
        [
          { id: 'cat-material', nome: 'Material' },
          { id: 'cat-outros', nome: 'Outros' },
        ]
      );
    });

    test('salva a imagem e cria o comprovante com os dados extraídos pela IA', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: 'Mercado Central',
        data: '2026-09-14',
        valor: 42.5,
        categoriaId: 'cat-material',
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/comprovante-1.jpg');
      Comprovante.create.mockResolvedValueOnce({
        id: 'comprovante-1',
        estabelecimento: 'Mercado Central',
        data: '2026-09-14',
        valor: 42.5,
        categoriaId: 'cat-material',
        imagemUrl: 'uploads/comprovante-1.jpg',
        usuarioId: 'usuario-1',
      });

      const resultado = await ComprovanteService.criarComIA('usuario-1', arquivo);

      expect(ArmazenamentoService.salvar).toHaveBeenCalledWith(
        arquivo.buffer,
        arquivo.mimetype
      );
      expect(Comprovante.create).toHaveBeenCalledWith({
        estabelecimento: 'Mercado Central',
        data: '2026-09-14',
        valor: 42.5,
        categoriaId: 'cat-material',
        imagemUrl: 'uploads/comprovante-1.jpg',
        usuarioId: 'usuario-1',
      });
      expect(resultado.id).toBe('comprovante-1');
    });

    test('usa a categoria "Outros" quando a IA retorna categoriaId null', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: null,
        data: null,
        valor: null,
        categoriaId: null,
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/x.jpg');
      Comprovante.create.mockResolvedValueOnce({ id: 'comprovante-1' });

      await ComprovanteService.criarComIA('usuario-1', arquivo);

      expect(Comprovante.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'cat-outros' })
      );
    });

    test('usa "Outros" quando a IA retorna um categoriaId que não pertence ao usuário', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: null,
        data: null,
        valor: null,
        categoriaId: 'categoria-de-outro-usuario',
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/x.jpg');
      Comprovante.create.mockResolvedValueOnce({ id: 'comprovante-1' });

      await ComprovanteService.criarComIA('usuario-1', arquivo);

      expect(Comprovante.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'cat-outros' })
      );
    });

    test('normaliza data inválida retornada pela IA para null, sem bloquear a criação', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: 'Mercado',
        data: '2999-01-01',
        valor: 10,
        categoriaId: 'cat-material',
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/x.jpg');
      Comprovante.create.mockResolvedValueOnce({ id: 'comprovante-1' });

      await ComprovanteService.criarComIA('usuario-1', arquivo);

      expect(Comprovante.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: null, estabelecimento: 'Mercado' })
      );
    });

    test('normaliza valor inválido retornado pela IA para null, sem bloquear a criação', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: null,
        data: null,
        valor: -5,
        categoriaId: 'cat-material',
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/x.jpg');
      Comprovante.create.mockResolvedValueOnce({ id: 'comprovante-1' });

      await ComprovanteService.criarComIA('usuario-1', arquivo);

      expect(Comprovante.create).toHaveBeenCalledWith(
        expect.objectContaining({ valor: null })
      );
    });

    test('propaga o erro 422 de imagem ilegível sem salvar imagem nem comprovante', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      const erroIlegivel = Object.assign(new Error('Não foi possível ler o comprovante.'), {
        statusCode: 422,
      });
      geminiService.analisarComprovante.mockRejectedValueOnce(erroIlegivel);

      await expect(
        ComprovanteService.criarComIA('usuario-1', arquivo)
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(ArmazenamentoService.salvar).not.toHaveBeenCalled();
      expect(Comprovante.create).not.toHaveBeenCalled();
    });

    test('propaga o erro 503 de falha do Gemini sem salvar imagem nem comprovante', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      const erroIndisponivel = Object.assign(new Error('Serviço indisponível.'), {
        statusCode: 503,
      });
      geminiService.analisarComprovante.mockRejectedValueOnce(erroIndisponivel);

      await expect(
        ComprovanteService.criarComIA('usuario-1', arquivo)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(ArmazenamentoService.salvar).not.toHaveBeenCalled();
      expect(Comprovante.create).not.toHaveBeenCalled();
    });

    test('remove a imagem salva se a criação do comprovante falhar no banco', async () => {
      Categoria.findAll.mockResolvedValueOnce(categoriasDoUsuario);
      geminiService.analisarComprovante.mockResolvedValueOnce({
        estabelecimento: null,
        data: null,
        valor: null,
        categoriaId: 'cat-material',
      });
      ArmazenamentoService.salvar.mockResolvedValueOnce('uploads/orfa.jpg');
      Comprovante.create.mockRejectedValueOnce(new Error('falha no banco'));

      await expect(
        ComprovanteService.criarComIA('usuario-1', arquivo)
      ).rejects.toThrow('falha no banco');

      expect(ArmazenamentoService.remover).toHaveBeenCalledWith('uploads/orfa.jpg');
    });
  });

  test('listar consulta somente comprovantes do usuário autenticado', async () => {
    const comprovantes = [
      { id: 'comprovante-1', usuarioId: 'usuario-1', imagemUrl: '/interno/1.jpg' },
    ];
    Comprovante.findAll.mockResolvedValueOnce(comprovantes);

    const resultado = await ComprovanteService.listar('usuario-1');

    expect(Comprovante.findAll).toHaveBeenCalledWith({
      where: { usuarioId: 'usuario-1' },
      order: [['createdAt', 'DESC']],
      limit: 20,
      offset: 0,
    });
    expect(resultado).toEqual([
      { id: 'comprovante-1', usuarioId: 'usuario-1' },
    ]);
  });

  test('detalhar comprovante de outro usuário rejeita com 403', async () => {
    Comprovante.findByPk.mockResolvedValueOnce({
      id: 'comprovante-1',
      usuarioId: 'outro-usuario',
    });

    await expect(
      ComprovanteService.detalhar('comprovante-1', 'usuario-1')
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Você não tem permissão para acessar este comprovante.',
    });
  });

  test('editar comprovante inexistente rejeita com 404 sem alterar dados', async () => {
    Comprovante.findByPk.mockResolvedValueOnce(null);

    await expect(
      ComprovanteService.editar('inexistente', 'usuario-1', { valor: 10.5 })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Comprovante não encontrado.',
    });
    expect(Categoria.findByPk).not.toHaveBeenCalled();
  });

  test('editar aceita categoria global existente sem exigir usuarioId na categoria', async () => {
    const comprovante = {
      id: 'comprovante-1',
      usuarioId: 'usuario-1',
      categoriaId: 'categoria-antiga',
      update: jest.fn(async function atualizar(dados) {
        Object.assign(this, dados);
      }),
    };
    Comprovante.findByPk.mockResolvedValueOnce(comprovante);
    Categoria.findByPk.mockResolvedValueOnce({ id: 'categoria-1' });

    const resultado = await ComprovanteService.editar(
      'comprovante-1',
      'usuario-1',
      { categoriaId: 'categoria-1' }
    );

    expect(comprovante.update).toHaveBeenCalledWith({
      categoriaId: 'categoria-1',
    });
    expect(resultado.categoriaId).toBe('categoria-1');
  });

  test('editar atualiza observacoes com trim', async () => {
    const comprovante = {
      id: 'comprovante-1',
      usuarioId: 'usuario-1',
      observacoes: null,
      update: jest.fn(async function atualizar(dados) {
        Object.assign(this, dados);
      }),
    };
    Comprovante.findByPk.mockResolvedValueOnce(comprovante);

    const resultado = await ComprovanteService.editar(
      'comprovante-1',
      'usuario-1',
      { observacoes: '  nova observação  ' }
    );

    expect(comprovante.update).toHaveBeenCalledWith({
      observacoes: 'nova observação',
    });
    expect(resultado.observacoes).toBe('nova observação');
  });

  test('editar limpa observacoes enviando null', async () => {
    const comprovante = {
      id: 'comprovante-1',
      usuarioId: 'usuario-1',
      observacoes: 'antiga',
      update: jest.fn(async function atualizar(dados) {
        Object.assign(this, dados);
      }),
    };
    Comprovante.findByPk.mockResolvedValueOnce(comprovante);

    const resultado = await ComprovanteService.editar(
      'comprovante-1',
      'usuario-1',
      { observacoes: null }
    );

    expect(comprovante.update).toHaveBeenCalledWith({
      observacoes: null,
    });
    expect(resultado.observacoes).toBeNull();
  });

  test.each(['editar', 'excluir'])(
    '%s rejeita acesso de outro usuário com 403',
    async (operacao) => {
      Comprovante.findByPk.mockResolvedValueOnce({
        id: 'comprovante-1',
        usuarioId: 'outro-usuario',
      });

      const argumentos = operacao === 'editar'
        ? ['comprovante-1', 'usuario-1', { valor: 10.5 }]
        : ['comprovante-1', 'usuario-1'];

      await expect(
        ComprovanteService[operacao](...argumentos)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Você não tem permissão para acessar este comprovante.',
      });
    }
  );
});
