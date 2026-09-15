jest.mock('../../services/ComprovanteService', () => ({
  criar: jest.fn(),
  listar: jest.fn(),
  detalhar: jest.fn(),
  editar: jest.fn(),
  excluir: jest.fn(),
}));

const ComprovanteService = require('../../services/ComprovanteService');
const ComprovanteController = require('../ComprovanteController');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

function criarResposta() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

describe('ComprovanteController', () => {
  const jwtSecretOriginal = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'segredo-dos-testes-de-comprovante';
  });

  afterAll(() => {
    process.env.JWT_SECRET = jwtSecretOriginal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/comprovantes cria com o usuário autenticado e responde 201', async () => {
    const comprovante = {
      id: 'comprovante-1',
      usuarioId: 'usuario-1',
      categoriaId: 'categoria-1',
    };
    ComprovanteService.criar.mockResolvedValueOnce(comprovante);
    const token = jwt.sign({ id: 'usuario-1' }, process.env.JWT_SECRET);
    const body = {
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'categoria-1',
      imagemUrl: '/interno/comprovante.jpg',
    };

    const response = await request(app)
      .post('/api/comprovantes')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect(ComprovanteService.criar).toHaveBeenCalledWith('usuario-1', body);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: 'sucesso',
      data: comprovante,
    });
  });

  test('POST /api/comprovantes sem autenticação responde 401', async () => {
    const response = await request(app)
      .post('/api/comprovantes')
      .send({
        categoriaId: 'categoria-1',
        imagemUrl: '/interno/comprovante.jpg',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 'erro',
      mensagem: 'Token não fornecido',
    });
    expect(ComprovanteService.criar).not.toHaveBeenCalled();
  });

  test('criar converte erro de validação do service em 400', async () => {
    const erro = Object.assign(new Error('categoriaId é obrigatório.'), {
      statusCode: 400,
    });
    ComprovanteService.criar.mockRejectedValueOnce(erro);
    const req = {
      usuarioId: 'usuario-1',
      body: { imagemUrl: '/interno/comprovante.jpg' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.criar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ erro: erro.message });
    expect(next).not.toHaveBeenCalled();
  });

  test('listar responde com os comprovantes retornados pelo service', async () => {
    const comprovantes = [{ id: 'comprovante-1', usuarioId: 'usuario-1' }];
    ComprovanteService.listar.mockResolvedValueOnce(comprovantes);
    const req = { usuarioId: 'usuario-1', query: {} };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.listar(req, res, next);

    expect(ComprovanteService.listar).toHaveBeenCalledWith('usuario-1', {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'sucesso',
      data: comprovantes,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('detalhar responde 200 com o comprovante retornado pelo service', async () => {
    const comprovante = { id: 'comprovante-1', usuarioId: 'usuario-1' };
    ComprovanteService.detalhar.mockResolvedValueOnce(comprovante);
    const req = {
      params: { id: 'comprovante-1' },
      usuarioId: 'usuario-1',
    };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.detalhar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'sucesso',
      data: comprovante,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('editar responde 200 com o comprovante atualizado', async () => {
    const comprovante = {
      id: 'comprovante-1',
      usuarioId: 'usuario-1',
      valor: 25.75,
    };
    ComprovanteService.editar.mockResolvedValueOnce(comprovante);
    const req = {
      params: { id: 'comprovante-1' },
      usuarioId: 'usuario-1',
      body: { valor: 25.75 },
    };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.editar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'sucesso',
      data: comprovante,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('excluir responde 204 sem corpo', async () => {
    ComprovanteService.excluir.mockResolvedValueOnce();
    const req = {
      params: { id: 'comprovante-1' },
      usuarioId: 'usuario-1',
    };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.excluir(req, res, next);

    expect(ComprovanteService.excluir).toHaveBeenCalledWith(
      'comprovante-1',
      'usuario-1'
    );
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  test('detalhar converte erro de propriedade do service em 403', async () => {
    const erro = Object.assign(new Error(
      'Você não tem permissão para acessar este comprovante.'
    ), { statusCode: 403 });
    ComprovanteService.detalhar.mockRejectedValueOnce(erro);
    const req = {
      params: { id: 'comprovante-1' },
      usuarioId: 'usuario-1',
    };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.detalhar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ erro: erro.message });
    expect(next).not.toHaveBeenCalled();
  });

  test('editar converte comprovante inexistente do service em 404', async () => {
    const erro = Object.assign(new Error('Comprovante não encontrado.'), {
      statusCode: 404,
    });
    ComprovanteService.editar.mockRejectedValueOnce(erro);
    const req = {
      params: { id: 'inexistente' },
      usuarioId: 'usuario-1',
      body: { valor: 10.5 },
    };
    const res = criarResposta();
    const next = jest.fn();

    await ComprovanteController.editar(req, res, next);

    expect(ComprovanteService.editar).toHaveBeenCalledWith(
      'inexistente',
      'usuario-1',
      { valor: 10.5 }
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ erro: erro.message });
    expect(next).not.toHaveBeenCalled();
  });
});
