jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('../app', () => ({ listen: jest.fn() }));
jest.mock('../models', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
  },
  Categoria: { seedIniciais: jest.fn().mockRejectedValue(new Error('Proprietário obrigatório')) },
}));

const app = require('../app');
const { sequelize, Categoria } = require('../models');

test('inicia em desenvolvimento sem executar seed global de categorias', async () => {
  const ambienteAnterior = process.env.NODE_ENV;
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.NODE_ENV = 'development';

  try {
    require('../server');
    await new Promise(setImmediate);

    expect(sequelize.authenticate).toHaveBeenCalledTimes(1);
    expect(sequelize.sync).toHaveBeenCalledWith();
    expect(Categoria.seedIniciais).not.toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
  } finally {
    if (ambienteAnterior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = ambienteAnterior;
    jest.restoreAllMocks();
  }
});
