const autenticacao = require('../autenticacao');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Middleware autenticacao', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        process.env.JWT_SECRET = 'secret_test';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('rejeita se nao tiver token no header', () => {
        autenticacao(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ erro: 'Token não fornecido ou malformado' });
    });

    test('rejeita se nao tiver prefixo Bearer', () => {
        req.headers['authorization'] = 'MeuToken123';
        autenticacao(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('rejeita se o payload nao tiver id', () => {
        req.headers['authorization'] = 'Bearer tokenteste';
        jwt.verify.mockReturnValue({}); // sem id
        autenticacao(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ erro: 'Token inválido ou expirado' });
    });

    test('passa se o token for valido e tiver id', () => {
        req.headers['authorization'] = 'Bearer tokenteste';
        jwt.verify.mockReturnValue({ id: 'uuid-123' });
        autenticacao(req, res, next);
        expect(req.usuarioId).toBe('uuid-123');
        expect(next).toHaveBeenCalled();
    });
});
