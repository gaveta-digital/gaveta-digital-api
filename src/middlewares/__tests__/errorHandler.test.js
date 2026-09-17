const errorHandler = require('../errorHandler');

describe('errorHandler Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('encaminha pro next() se headers ja foram enviados', () => {
    res.headersSent = true;
    const erro = new Error('Teste erro');

    errorHandler(erro, req, res, next);

    expect(next).toHaveBeenCalledWith(erro);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('retorna 500 com erro generico se statusCode nao for definido', () => {
    const erro = new Error('Falha desconhecida');

    errorHandler(erro, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Falha desconhecida',
    });
  });

  test('retorna statusCode customizado se presente no erro', () => {
    const erro = new Error('Email já cadastrado');
    erro.statusCode = 409;

    errorHandler(erro, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Email já cadastrado',
    });
  });

  test('inclui stack em desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    const erro = new Error('Erro teste');
    erro.statusCode = 500;

    errorHandler(erro, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        erro: 'Erro teste',
        detalhe: expect.any(String),
      })
    );
    expect(res.json.mock.calls[0][0].detalhe).toContain('Error: Erro teste');

    process.env.NODE_ENV = 'test';
  });

  test('nao inclui stack em producao', () => {
    process.env.NODE_ENV = 'production';
    const erro = new Error('Erro teste');
    erro.statusCode = 500;

    errorHandler(erro, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      erro: 'Erro teste',
    });
    expect(res.json.mock.calls[0][0].detalhe).toBeUndefined();

    process.env.NODE_ENV = 'test';
  });

  test('retorna mensagem padrao se erro nao tiver message', () => {
    const erro = {};

    errorHandler(erro, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Erro interno do servidor',
    });
  });
});
