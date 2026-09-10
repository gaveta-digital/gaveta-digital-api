const CategoriaController = require('../CategoriaController');
const { Categoria, Comprovante, sequelize, Usuario } = require('../../models');

describe('CategoriaController', () => {
  let req, res, next;

  beforeAll(async () => {
    // Garantir que estamos usando um ambiente de teste ou limpando o banco
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Comprovante.destroy({ where: {}, truncate: true, force: true });
    await Categoria.destroy({ where: {}, truncate: true, force: true });
    await Usuario.destroy({ where: {}, truncate: true, force: true });

    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Criação (POST)', () => {
    test('Criar categoria válida → 201', async () => {
      req.body = { nome: 'Saude' };

      await CategoriaController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Saude' }));
    });

    test('Criar categoria duplicada → 409', async () => {
      await Categoria.create({ nome: 'Saude' });
      req.body = { nome: 'Saude' };

      await CategoriaController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'Categoria já cadastrada'
      });
    });

    test('Criar categoria com dados inválidos (nome vazio) → 400', async () => {
      req.body = { nome: '' };

      await CategoriaController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        erro: expect.any(String)
      }));
    });

    test('Criar categoria com nome > 50 caracteres → 400', async () => {
      req.body = { nome: 'a'.repeat(51) };

      await CategoriaController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'O nome deve ter no máximo 50 caracteres'
      });
    });

    test('Falha inesperada na criação → next(error)', async () => {
      const error = new Error('Erro de banco');
      jest.spyOn(Categoria, 'create').mockRejectedValueOnce(error);
      req.body = { nome: 'Erro' };

      await CategoriaController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      Categoria.create.mockRestore();
    });
  });

  describe('Edição (PUT)', () => {
    test('Editar categoria válida → 200', async () => {
      const cat = await Categoria.create({ nome: 'Original' });
      req.params = { id: cat.id };
      req.body = { nome: 'Editada' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Editada' }));
    });

    test('Editar para nome já existente → 409', async () => {
      await Categoria.create({ nome: 'Existente' });
      const cat = await Categoria.create({ nome: 'Original' });

      req.params = { id: cat.id };
      req.body = { nome: 'Existente' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'Categoria já cadastrada'
      });
    });

    test('Editar categoria inexistente → 404', async () => {
      req.params = { id: '00000000-0000-0000-0000-000000000000' };
      req.body = { nome: 'Nova' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'Categoria não encontrada'
      });
    });

    test('Tentar renomear "Outros" → 400', async () => {
      const cat = await Categoria.create({ nome: 'Outros' });
      req.params = { id: cat.id };
      req.body = { nome: 'Nova Categoria' };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'A categoria "Outros" não pode ser renomeada'
      });

      const check = await Categoria.findByPk(cat.id);
      expect(check.nome).toBe('Outros');
    });

    test('Editar com dados inválidos → 400', async () => {
      const cat = await Categoria.create({ nome: 'Original' });
      req.params = { id: cat.id };
      req.body = { nome: 'a'.repeat(51) };

      await CategoriaController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'O nome deve ter no máximo 50 caracteres'
      });
    });
  });

  describe('Exclusão (DELETE)', () => {
    test('Excluir categoria válida → 204', async () => {
      const cat = await Categoria.create({ nome: 'Deletavel' });
      req.params = { id: cat.id };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      const check = await Categoria.findByPk(cat.id);
      expect(check).toBeNull();
    });

    test('Excluir categoria inexistente → 404', async () => {
      req.params = { id: '00000000-0000-0000-0000-000000000000' };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'Categoria não encontrada'
      });
    });

    test('Excluir "Outros" → 400', async () => {
      const cat = await Categoria.create({ nome: 'Outros' });
      req.params = { id: cat.id };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'A categoria "Outros" não pode ser excluída'
      });

      const check = await Categoria.findByPk(cat.id);
      expect(check).not.toBeNull();
    });

    test('Excluir categoria com comprovantes → 400', async () => {
      const cat = await Categoria.create({ nome: 'Com Vínculo' });
      const user = await Usuario.create({ nome: 'User', email: 'u@u.com', senha: 'password' });
      await Comprovante.create({
        imagemUrl: 'url',
        usuarioId: user.id,
        categoriaId: cat.id
      });

      req.params = { id: cat.id };

      await CategoriaController.delete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        erro: 'Não é possível excluir categoria com comprovantes vinculados'
      });
    });
  });

  describe('Listagem (GET)', () => {
    test('Listar categorias → 200', async () => {
      await Categoria.create({ nome: 'Cat 1' });
      await Categoria.create({ nome: 'Cat 2' });

      await CategoriaController.list(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0];
      expect(data.length).toBe(2);
    });
  });
});
