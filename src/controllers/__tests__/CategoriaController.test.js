const { ValidationError, ValidationErrorItem, UniqueConstraintError } = require('sequelize');
const CategoriaController = require('../CategoriaController');
const { Categoria, Comprovante } = require('../../models');

jest.mock('../../models', () => ({
  Categoria: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  Comprovante: { count: jest.fn() },
}));

describe('CategoriaController — testes unitários', () => {
  const usuarioId = 'usuario-autenticado';
  let req, res, next, categoria;

  beforeEach(() => {
    // Limpa também implementações e respostas, evitando dependência entre casos.
    jest.resetAllMocks();
    req = { body: {}, params: { id: 'categoria-1' }, usuarioId };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    categoria = {
      id: 'categoria-1',
      nome: 'Material',
      usuarioId,
      update: jest.fn(),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    categoria.update.mockImplementation(async ({ nome }) => {
      categoria.nome = nome;
      return categoria;
    });
    Categoria.findOne.mockResolvedValue(categoria);
    Comprovante.count.mockResolvedValue(0);
  });

  function esperarJson(status, corpo) {
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(corpo);
    expect(res.send).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  }

  function esperarEncaminhamento(error) {
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  }

  function esperarSemEscritas() {
    expect(Categoria.create).not.toHaveBeenCalled();
    expect(categoria.update).not.toHaveBeenCalled();
    expect(categoria.destroy).not.toHaveBeenCalled();
  }

  describe('Criação', () => {
    test('retorna 201 e utiliza apenas nome e proprietário autenticado', async () => {
      req.body = { nome: 'Material', usuarioId: 'outro-usuario', id: 'id-forjado' };
      Categoria.create.mockResolvedValue(categoria);

      await CategoriaController.create(req, res, next);

      expect(Categoria.create).toHaveBeenCalledTimes(1);
      expect(Categoria.create).toHaveBeenCalledWith({ nome: 'Material', usuarioId });
      esperarJson(201, categoria);
    });

    test.each([
      ['ausente', {}],
      ['null', { nome: null }],
      ['vazio', { nome: '' }],
    ])('nome %s retorna 400 sem gravar', async (_caso, body) => {
      req.body = body;

      await CategoriaController.create(req, res, next);

      esperarJson(400, { erro: 'O nome da categoria é obrigatório' });
      esperarSemEscritas();
    });
  });

  describe('Listagem', () => {
    test.each([
      ['com resultados', [{ id: 'categoria-1', nome: 'Material', usuarioId }]],
      ['vazia', []],
    ])('retorna 200 para lista %s, filtrando pelo usuário autenticado', async (_caso, lista) => {
      req.body = { usuarioId: 'outro-usuario' };
      req.query = { usuarioId: 'outro-usuario' };
      Categoria.findAll.mockResolvedValue(lista);

      await CategoriaController.list(req, res, next);

      expect(Categoria.findAll).toHaveBeenCalledTimes(1);
      expect(Categoria.findAll).toHaveBeenCalledWith({ where: { usuarioId } });
      esperarJson(200, lista);
      esperarSemEscritas();
    });

    test('encaminha falha da consulta sem responder sucesso', async () => {
      const error = new Error('Falha na listagem');
      Categoria.findAll.mockRejectedValue(error);

      await CategoriaController.list(req, res, next);

      esperarEncaminhamento(error);
      esperarSemEscritas();
    });
  });

  describe('Edição', () => {
    test('edita categoria própria e retorna 200, ignorando proprietário e ID enviados no corpo', async () => {
      req.body = { nome: 'Pet', usuarioId: 'outro-usuario', id: 'id-forjado' };

      await CategoriaController.update(req, res, next);

      expect(Categoria.findOne).toHaveBeenCalledWith({ where: { id: categoria.id, usuarioId } });
      expect(categoria.update).toHaveBeenCalledTimes(1);
      expect(categoria.update).toHaveBeenCalledWith({ nome: 'Pet' });
      esperarJson(200, categoria);
      expect(res.json.mock.calls[0][0]).toMatchObject({ nome: 'Pet', usuarioId, id: 'categoria-1' });
      expect(categoria.destroy).not.toHaveBeenCalled();
    });

    test.each([
      ['ausente', {}],
      ['null', { nome: null }],
      ['vazio', { nome: '' }],
    ])('nome %s retorna 400 sem consultar ou atualizar', async (_caso, body) => {
      req.body = body;

      await CategoriaController.update(req, res, next);

      esperarJson(400, { erro: 'O nome da categoria é obrigatório para atualização' });
      expect(Categoria.findOne).not.toHaveBeenCalled();
      esperarSemEscritas();
    });

    test('permite renomear categoria comum com comprovantes sem alterar seus vínculos', async () => {
      const comprovantes = [{ id: 'comprovante-1', categoriaId: categoria.id }];
      categoria.comprovantes = comprovantes;
      Comprovante.count.mockResolvedValue(1);
      req.body = { nome: 'Equipamentos' };

      await CategoriaController.update(req, res, next);

      expect(categoria.update).toHaveBeenCalledWith({ nome: 'Equipamentos' });
      esperarJson(200, categoria);
      expect(categoria.id).toBe('categoria-1');
      expect(categoria.comprovantes).toEqual([{ id: 'comprovante-1', categoriaId: 'categoria-1' }]);
      expect(categoria.destroy).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['edição', 'update'],
    ['exclusão', 'delete'],
  ])('Bloqueios na %s', (_rotulo, metodo) => {
    beforeEach(() => {
      req.body = { nome: 'Novo nome' };
    });

    test('categoria inexistente retorna 404 sem alterar dados', async () => {
      Categoria.findOne.mockResolvedValue(null);

      await CategoriaController[metodo](req, res, next);

      expect(Categoria.findOne).toHaveBeenCalledWith({ where: { id: req.params.id, usuarioId } });
      esperarJson(404, { erro: 'Categoria não encontrada' });
      esperarSemEscritas();
      expect(Comprovante.count).not.toHaveBeenCalled();
    });

    test('categoria de outro usuário retorna 404 mesmo com proprietário forjado no corpo', async () => {
      categoria.usuarioId = 'outro-usuario';
      req.body.usuarioId = categoria.usuarioId;
      // Simula o filtro da persistência sobre um registro de outro proprietário.
      Categoria.findOne.mockImplementation(async ({ where }) => (
        where.id === categoria.id && where.usuarioId === categoria.usuarioId ? categoria : null
      ));

      await CategoriaController[metodo](req, res, next);

      expect(Categoria.findOne).toHaveBeenCalledTimes(1);
      expect(Categoria.findOne).toHaveBeenCalledWith({ where: { id: categoria.id, usuarioId } });
      esperarJson(404, { erro: 'Categoria não encontrada' });
      esperarSemEscritas();
      expect(Comprovante.count).not.toHaveBeenCalled();
    });

    test.each([0, 2])('protege Outros com %i comprovantes, sem executar alterações', async (quantidade) => {
      categoria.nome = 'Outros';
      categoria.comprovantes = Array.from({ length: quantidade }, (_, i) => ({ id: `comprovante-${i}`, categoriaId: categoria.id }));
      Comprovante.count.mockResolvedValue(quantidade);

      await CategoriaController[metodo](req, res, next);

      const acao = metodo === 'update' ? 'renomeada' : 'excluída';
      esperarJson(400, { erro: `A categoria "Outros" não pode ser ${acao}` });
      esperarSemEscritas();
      expect(Comprovante.count).not.toHaveBeenCalled();
    });

    test('falha na busca é encaminhada sem executar alterações', async () => {
      const error = new Error('Falha ao buscar categoria');
      Categoria.findOne.mockRejectedValue(error);

      await CategoriaController[metodo](req, res, next);

      esperarEncaminhamento(error);
      esperarSemEscritas();
      expect(Comprovante.count).not.toHaveBeenCalled();
    });
  });

  describe('Exclusão', () => {
    test('exclui categoria própria sem comprovantes e retorna 204 sem corpo', async () => {
      req.body = { usuarioId: 'outro-usuario' };

      await CategoriaController.delete(req, res, next);

      expect(Categoria.findOne).toHaveBeenCalledWith({ where: { id: categoria.id, usuarioId } });
      expect(Comprovante.count).toHaveBeenCalledWith({ where: { categoriaId: categoria.id } });
      expect(categoria.destroy).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(categoria.update).not.toHaveBeenCalled();
    });

    test.each([1, 5])('bloqueia exclusão com %i comprovantes vinculados', async (quantidade) => {
      Comprovante.count.mockResolvedValue(quantidade);

      await CategoriaController.delete(req, res, next);

      expect(Comprovante.count).toHaveBeenCalledWith({ where: { categoriaId: categoria.id } });
      esperarJson(400, { erro: 'Não é possível excluir categoria com comprovantes vinculados' });
      esperarSemEscritas();
    });

    test('falha na contagem é encaminhada sem excluir categoria', async () => {
      const error = new Error('Falha na contagem');
      Comprovante.count.mockRejectedValue(error);

      await CategoriaController.delete(req, res, next);

      esperarEncaminhamento(error);
      esperarSemEscritas();
    });

    test('falha na exclusão é encaminhada sem responder 204', async () => {
      const error = new Error('Falha na exclusão');
      categoria.destroy.mockRejectedValue(error);

      await CategoriaController.delete(req, res, next);

      expect(categoria.destroy).toHaveBeenCalledTimes(1);
      esperarEncaminhamento(error);
    });
  });

  describe.each([
    ['criação', 'create'],
    ['edição', 'update'],
  ])('Erros da persistência na %s', (_rotulo, metodo) => {
    test.each(['validação', 'duplicidade', 'inesperado'])(
      'encaminha erro de %s sem produzir resposta de sucesso',
      async (tipo) => {
        // O model valida; o middleware converte o erro em HTTP 400/409/500.
        const erros = {
          validação: new ValidationError('Nome inválido', [new ValidationErrorItem('Nome inválido', 'Validation error', 'nome')]),
          duplicidade: new UniqueConstraintError({ errors: [new ValidationErrorItem('Categoria já cadastrada', 'unique violation', 'nomeNormalizado')] }),
          inesperado: new Error('Falha de persistência'),
        };
        const error = erros[tipo];
        req.body = { nome: tipo === 'validação' ? '   ' : 'Pet' };
        const escrita = metodo === 'create' ? Categoria.create : categoria.update;
        escrita.mockRejectedValue(error);

        await CategoriaController[metodo](req, res, next);

        expect(escrita).toHaveBeenCalledTimes(1);
        esperarEncaminhamento(error);
        expect(categoria.destroy).not.toHaveBeenCalled();
        if (metodo === 'create') expect(categoria.update).not.toHaveBeenCalled();
        else expect(Categoria.create).not.toHaveBeenCalled();
      }
    );
  });
});
