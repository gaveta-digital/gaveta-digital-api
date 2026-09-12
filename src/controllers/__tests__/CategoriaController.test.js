const CategoriaController = require('../CategoriaController');
const { Categoria, Comprovante } = require('../../models');

jest.mock('../../models', () => ({
  Categoria: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Comprovante: {
    count: jest.fn(),
  },
}));

describe('CategoriaController (Unit Tests with Mocks)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('Criação (POST)', () => {
    test('Encaminha erros de validação/duplicidade para o next(error)', async () => {
      const error = new Error('Sequelize Error');
      Categoria.create.mockRejectedValue(error);
      req.body = { nome: 'Invalida' };

      await CategoriaController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('Criar categoria válida → 201', async () => {
      const mockCat = { id: 1, nome: 'Saude' };
      Categoria.create.mockResolvedValue(mockCat);
      req.body = { nome: 'Saude' };

      await CategoriaController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCat);
    });
  });

  describe('Edição (PUT)', () => {
    test('Editar categoria inexistente → 404', async () => {
      Categoria.findByPk.mockResolvedValue(null);
      req.params = { id: '999' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ erro: 'Categoria não encontrada' });
    });

    test('Tentar renomear "Outros" → 400', async () => {
      const mockOutros = {
        id: 1,
        nome: 'Outros',
        update: jest.fn()
      };
      Categoria.findByPk.mockResolvedValue(mockOutros);
      req.params = { id: 1 };
      req.body = { nome: 'Novo Nome' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'A categoria "Outros" não pode ser renomeada' });
      expect(mockOutros.update).not.toHaveBeenCalled();
    });

    test('Editar categoria válida → 200', async () => {
      const mockCat = {
        id: 2,
        nome: 'Original',
        update: jest.fn().mockResolvedValue(true)
      };
      Categoria.findByPk.mockResolvedValue(mockCat);
      req.params = { id: 2 };
      req.body = { nome: 'Editada' };

      await CategoriaController.update(req, res, next);

      expect(mockCat.update).toHaveBeenCalledWith({ nome: 'Editada' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Exclusão (DELETE)', () => {
    test('Excluir categoria inexistente → 404', async () => {
      Categoria.findByPk.mockResolvedValue(null);
      req.params = { id: '999' };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('Excluir "Outros" → 400', async () => {
      const mockOutros = { id: 1, nome: 'Outros', destroy: jest.fn() };
      Categoria.findByPk.mockResolvedValue(mockOutros);
      req.params = { id: 1 };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'A categoria "Outros" não pode ser excluída' });
      expect(mockOutros.destroy).not.toHaveBeenCalled();
    });

    test('Excluir categoria com comprovantes → 400', async () => {
      const mockCat = { id: 2, nome: 'Comum', destroy: jest.fn() };
      Categoria.findByPk.mockResolvedValue(mockCat);
      Comprovante.count.mockResolvedValue(5);
      req.params = { id: 2 };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'Não é possível excluir categoria com comprovantes vinculados' });
      expect(mockCat.destroy).not.toHaveBeenCalled();
    });

    test('Excluir categoria válida → 204', async () => {
      const mockCat = { id: 2, nome: 'Comum', destroy: jest.fn().mockResolvedValue(true) };
      Categoria.findByPk.mockResolvedValue(mockCat);
      Comprovante.count.mockResolvedValue(0);
      req.params = { id: 2 };

      await CategoriaController.delete(req, res, next);

      expect(mockCat.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Listagem (GET)', () => {
    test('Listar categorias → 200', async () => {
      const mockList = [{ nome: 'Cat 1' }, { nome: 'Cat 2' }];
      Categoria.findAll.mockResolvedValue(mockList);

      await CategoriaController.list(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockList);
    });
  });
});
