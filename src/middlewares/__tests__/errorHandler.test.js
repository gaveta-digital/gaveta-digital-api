const errorHandler = require('../errorHandler');

describe('errorHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    console.error = jest.fn(); // Mock console.error to keep logs clean
  });

  test('Trata erro de validação do Sequelize → 400', () => {
    const error = {
      name: 'SequelizeValidationError',
      errors: [{ message: 'Nome é obrigatório' }]
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Nome é obrigatório' });
  });

  test('Trata erro de duplicidade do Sequelize → 409', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      errors: [{ message: 'E-mail duplicado' }]
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ erro: 'E-mail duplicado' });
  });

  test('Trata erro genérico → 500', () => {
    const error = new Error('Falha catastrófica');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Falha catastrófica' });
  });

  test('Não envia resposta se headers já foram enviados', () => {
    const error = new Error('Tarde demais');
    res.headersSent = true;

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
