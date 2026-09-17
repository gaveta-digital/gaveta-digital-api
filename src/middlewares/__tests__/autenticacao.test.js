const jwt = require('jsonwebtoken');
const autenticacao = require('../autenticacao');

jest.mock('jsonwebtoken');

describe('autenticacao Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'chave-teste-secreta';
    jest.clearAllMocks();
  });

  test('retorna 401 se token nao for fornecido', () => {
    req.headers.authorization = undefined;

    autenticacao(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Token não fornecido ou malformado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 se authorization header nao comeca com Bearer', () => {
    req.headers.authorization = 'Basic abc123';

    autenticacao(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Token não fornecido ou malformado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 se JWT_SECRET nao estiver configurado', () => {
    delete process.env.JWT_SECRET;
    req.headers.authorization = 'Bearer token-valido';

    autenticacao(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Token inválido ou expirado',
    });
    expect(next).not.toHaveBeenCalled();

    process.env.JWT_SECRET = 'chave-teste-secreta';
  });

  test('retorna 401 se token for inválido', () => {
    req.headers.authorization = 'Bearer token-invalido';
    jwt.verify.mockImplementation(() => {
      throw new Error('Token inválido');
    });

    autenticacao(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Token inválido ou expirado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 se token estiver expirado', () => {
    req.headers.authorization = 'Bearer token-expirado';
    jwt.verify.mockImplementation(() => {
      const erro = new Error('jwt expired');
      erro.name = 'TokenExpiredError';
      throw erro;
    });

    autenticacao(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Token inválido ou expirado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 se payload nao tiver id', () => {
    req.headers.authorization = 'Bearer token-valido';
    jwt.verify.mockReturnValue({ email: 'teste@teste.com' });

    autenticacao(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'Token inválido ou expirado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('chama next() e popula req.usuarioId se token for válido', () => {
    req.headers.authorization = 'Bearer token-valido';
    jwt.verify.mockReturnValue({ id: 'usuario-123' });

    autenticacao(req, res, next);

    expect(req.usuarioId).toBe('usuario-123');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('verifica token com JWT_SECRET correto', () => {
    req.headers.authorization = 'Bearer token-valido';
    jwt.verify.mockReturnValue({ id: 'usuario-123' });

    autenticacao(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      'token-valido',
      'chave-teste-secreta'
    );
  });
});
