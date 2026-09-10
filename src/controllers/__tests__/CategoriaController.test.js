const CategoriaController = require('../CategoriaController');
const { Categoria, Comprovante, sequelize, Usuario } = require('../../models');

describe('CategoriaController', () => {
  let req, res, next;

  beforeAll(async () => {
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

  test('Criar categoria válida → 201', async () => {
    req.body = { nome: 'Nova Categoria' };

    await CategoriaController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Nova Categoria' }));
  });

  test('Criar categoria duplicada → 409', async () => {
    await Categoria.create({ nome: 'Duplicada' });
    req.body = { nome: 'Duplicada' };

    await CategoriaController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'erro',
      message: 'Categoria já cadastrada'
    }));
  });

  test('Excluir categoria com comprovantes vinculados → 400', async () => {
    const categoria = await Categoria.create({ nome: 'Com Comprovantes' });
    const usuario = await Usuario.create({
      nome: 'Teste',
      email: 'teste@exemplo.com',
      senha: 'password'
    });

    await Comprovante.create({
      imagemUrl: 'http://link.com/imagem.png',
      usuarioId: usuario.id,
      categoriaId: categoria.id
    });

    req.params = { id: categoria.id };

    await CategoriaController.delete(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'erro',
      message: 'Não é possível excluir categoria com comprovantes vinculados'
    }));
  });

  test('Excluir categoria sem comprovantes → 204', async () => {
    const categoria = await Categoria.create({ nome: 'Sem Comprovantes' });
    req.params = { id: categoria.id };

    await CategoriaController.delete(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    const deletada = await Categoria.findByPk(categoria.id);
    expect(deletada).toBeNull();
  });

  test('Listar categorias → 200', async () => {
    await Categoria.create({ nome: 'Cat 1' });
    await Categoria.create({ nome: 'Cat 2' });

    await CategoriaController.list(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const result = res.json.mock.calls[0][0];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  test('Editar categoria → 200', async () => {
    const categoria = await Categoria.create({ nome: 'Original' });
    req.params = { id: categoria.id };
    req.body = { nome: 'Editada' };

    await CategoriaController.update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Editada' }));
  });
});
