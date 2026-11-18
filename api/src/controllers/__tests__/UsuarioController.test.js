const UsuarioController = require('../UsuarioController');
const UsuarioService = require('../../services/UsuarioService');

jest.mock('../../services/UsuarioService');

describe('Controller UsuarioController', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('criarUsuario', () => {
        test('retorna 201 com dados do usuario em caso de sucesso', async () => {
            req.body = { nome: 'Teste', email: 'teste@teste.com', senha: '123' };
            UsuarioService.criarUsuario.mockResolvedValue({ id: 1, nome: 'Teste', email: 'teste@teste.com' });

            await UsuarioController.criarUsuario(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'sucesso',
                data: expect.objectContaining({ id: 1, nome: 'Teste' })
            });
        });

        test('retorna 409 se email ja existir (conflito)', async () => {
            req.body = { nome: 'Teste', email: 'teste@teste.com', senha: '123' };
            UsuarioService.criarUsuario.mockRejectedValue(new Error('Email já cadastrado'));

            await UsuarioController.criarUsuario(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ erro: 'Email já cadastrado' });
        });

        test('encaminha falha desconhecida pro next()', async () => {
            req.body = { nome: 'Teste', email: 'teste@teste.com', senha: '123' };
            const erroDesconhecido = new Error('Falha bizarra');
            UsuarioService.criarUsuario.mockRejectedValue(erroDesconhecido);

            await UsuarioController.criarUsuario(req, res, next);

            expect(next).toHaveBeenCalledWith(erroDesconhecido);
        });
    });

    describe('loginUsuario', () => {
        test('retorna 200 com token e dados em caso de sucesso', async () => {
            req.body = { email: 'teste@teste.com', senha: '123' };
            UsuarioService.loginUsuario.mockResolvedValue({
                usuario: { id: 1, email: 'teste@teste.com' },
                token: 'tokenteste'
            });

            await UsuarioController.loginUsuario(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'sucesso',
                data: {
                    usuario: expect.any(Object),
                    token: 'tokenteste'
                }
            });
        });

        test('retorna 401 se credenciais invalidas', async () => {
            req.body = { email: 'teste@teste.com', senha: '123' };
            UsuarioService.loginUsuario.mockRejectedValue(new Error('email ou senha incorreta'));

            await UsuarioController.loginUsuario(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ erro: 'Email ou senha incorreta' });
        });
    });
});
