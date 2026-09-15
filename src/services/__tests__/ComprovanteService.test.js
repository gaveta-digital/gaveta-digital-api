jest.mock('../../models', () => ({
  Comprovante: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Categoria: {
    findByPk: jest.fn(),
  },
}));

const { Comprovante, Categoria } = require('../../models');
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
    }, 'Só é permitido informar estabelecimento, data, valor, categoriaId e imagemUrl.'],
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
