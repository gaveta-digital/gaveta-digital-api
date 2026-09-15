const CategoriaController = require('../CategoriaController');
const { Categoria, Comprovante } = require('../../models');

jest.mock('../../models', () => ({
  Categoria: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  Comprovante: {
    count: jest.fn(),
  },
}));

describe('CategoriaController (Unit Tests)', () => {
  let req, res, next;
  const mockUsuarioId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      usuarioId: mockUsuarioId
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('Criação (POST)', () => {
    test('Criar categoria válida vinculada ao usuário → 201', async () => {
      const mockCat = { id: 'cat-1', nome: 'Saude', usuarioId: mockUsuarioId };
      Categoria.create.mockResolvedValue(mockCat);
      req.body = { nome: 'Saude' };

      await CategoriaController.create(req, res, next);

      expect(Categoria.create).toHaveBeenCalledWith({ nome: 'Saude', usuarioId: mockUsuarioId });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCat);
    });

    test('Erro se nome estiver ausente → 400', async () => {
      req.body = {};
      await CategoriaController.create(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'O nome da categoria é obrigatório' });
    });

    test('Falha inesperada na criação → next(error)', async () => {
      const error = new Error('Database error');
      Categoria.create.mockRejectedValue(error);
      req.body = { nome: 'Erro' };

      await CategoriaController.create(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Listagem (GET)', () => {
    test('Listar apenas categorias do usuário autenticado → 200', async () => {
      const mockList = [{ nome: 'Cat 1', usuarioId: mockUsuarioId }];
      Categoria.findAll.mockResolvedValue(mockList);

      await CategoriaController.list(req, res, next);

      expect(Categoria.findAll).toHaveBeenCalledWith({ where: { usuarioId: mockUsuarioId } });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockList);
    });

    test('Falha inesperada na listagem → next(error)', async () => {
      const error = new Error('List error');
      Categoria.findAll.mockRejectedValue(error);
      await CategoriaController.list(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Edição (PUT)', () => {
    test('Editar categoria própria → 200', async () => {
      const mockCat = {
        id: 'cat-1',
        nome: 'Original',
        update: jest.fn().mockResolvedValue(true)
      };
      Categoria.findOne.mockResolvedValue(mockCat);
      req.params = { id: 'cat-1' };
      req.body = { nome: 'Editada' };

      await CategoriaController.update(req, res, next);

      expect(Categoria.findOne).toHaveBeenCalledWith({ where: { id: 'cat-1', usuarioId: mockUsuarioId } });
      expect(mockCat.update).toHaveBeenCalledWith({ nome: 'Editada' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('Erro se nome ausente na edição → 400', async () => {
      req.body = {};
      await CategoriaController.update(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'O nome da categoria é obrigatório para atualização' });
    });

    test('Editar categoria inexistente ou de outro usuário → 404', async () => {
      Categoria.findOne.mockResolvedValue(null);
      req.params = { id: '999' };
      req.body = { nome: 'Nova' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ erro: 'Categoria não encontrada' });
    });

    test('Impedir renomeação de "Outros" → 400', async () => {
      const mockOutros = { id: 'outros-id', nome: 'Outros', update: jest.fn() };
      Categoria.findOne.mockResolvedValue(mockOutros);
      req.params = { id: 'outros-id' };
      req.body = { nome: 'Novo Nome' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'A categoria "Outros" não pode ser renomeada' });
      expect(mockOutros.update).not.toHaveBeenCalled();
    });
  });

  describe('Exclusão (DELETE)', () => {
    test('Excluir categoria própria sem comprovantes → 204', async () => {
      const mockCat = { id: 'cat-1', nome: 'Comum', destroy: jest.fn().mockResolvedValue(true) };
      Categoria.findOne.mockResolvedValue(mockCat);
      Comprovante.count.mockResolvedValue(0);
      req.params = { id: 'cat-1' };

      await CategoriaController.delete(req, res, next);

      expect(mockCat.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    test('Impedir exclusão de "Outros" → 400', async () => {
      const mockOutros = { id: 'outros-id', nome: 'Outros', destroy: jest.fn() };
      Categoria.findOne.mockResolvedValue(mockOutros);
      req.params = { id: 'outros-id' };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'A categoria "Outros" não pode ser excluída' });
      expect(mockOutros.destroy).not.toHaveBeenCalled();
    });

    test('Impedir exclusão de categoria com comprovantes → 400', async () => {
      const mockCat = { id: 'cat-1', nome: 'Comum', destroy: jest.fn() };
      Categoria.findOne.mockResolvedValue(mockCat);
      Comprovante.count.mockResolvedValue(5);
      req.params = { id: 'cat-1' };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'Não é possível excluir categoria com comprovantes vinculados' });
      expect(mockCat.destroy).not.toHaveBeenCalled();
    });

    test('Falha inesperada na exclusão → next(error)', async () => {
      const mockCat = { id: 'cat-1', nome: 'Comum' };
      Categoria.findOne.mockResolvedValue(mockCat);
      Comprovante.count.mockResolvedValue(0);
      const error = new Error('Delete error');
      mockCat.destroy = jest.fn().mockRejectedValue(error);

      req.params = { id: 'cat-1' };
      await CategoriaController.delete(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
