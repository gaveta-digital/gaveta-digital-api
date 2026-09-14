const errorHandler = require('../errorHandler');

describe('errorHandler Middleware', () => {
  let req, res, next;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    req = {};
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('Trata erro genérico → 500 no contrato { erro }', () => {
    const error = new Error('Erro Interno');
    process.env.NODE_ENV = 'production';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro Interno' });
    expect(res.json).not.toHaveProperty('detalhe');
  });

  test('Exibe detalhe somente em ambiente de desenvolvimento', () => {
    const error = new Error('Erro com stack');
    process.env.NODE_ENV = 'development';

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      erro: 'Erro com stack',
      detalhe: expect.any(String)
    }));
  });

  test('Encaminha para next(error) se headers já foram enviados', () => {
    const error = new Error('Tarde demais');
    res.headersSent = true;

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Trata erros do Sequelize (validacao) no middleware', () => {
    const error = {
      name: 'SequelizeValidationError',
      errors: [{ message: 'Campo obrigatorio' }]
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Campo obrigatorio' });
  });
});
