const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, Usuario, Categoria } = require('../../models');
const UsuarioService = require('../UsuarioService');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../models', () => ({
    sequelize: {
        transaction: jest.fn()
    },
    Usuario: {
        findOne: jest.fn(),
        create: jest.fn(),
        scope: jest.fn().mockReturnThis()
    },
    Categoria: {
        seedIniciais: jest.fn()
    }
}));

describe('Service UsuarioService', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'secret_test';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('criarUsuario', () => {
        test('lanca erro se e-mail ja estiver cadastrado', async () => {
            Usuario.findOne.mockResolvedValue({ id: 1 });
            await expect(UsuarioService.criarUsuario('nome', 'teste@teste.com', 'senha'))
                .rejects.toThrow('Email já cadastrado');
        });

        test('lanca erro se a inicializacao de categorias falhar (simula rollback da transacao)', async () => {
            Usuario.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashedpassword');
            
            // Simula o comportamento do sequelize.transaction repassando o erro
            sequelize.transaction.mockImplementation(async (callback) => {
                return await callback('fake_transaction');
            });

            const mockNovoUser = { id: 99 };
            Usuario.create.mockResolvedValue(mockNovoUser);

            // Mock do seedIniciais para forçar um erro
            Categoria.seedIniciais.mockRejectedValue(new Error('Falha no banco ao criar categorias'));

            await expect(UsuarioService.criarUsuario('nome', 'teste@teste.com', 'senha'))
                .rejects.toThrow('Falha no banco ao criar categorias');
            
            // Garante que tentou criar o usuário na mesma transação antes de quebrar
            expect(Usuario.create).toHaveBeenCalledWith(
                expect.any(Object),
                { transaction: 'fake_transaction' }
            );
        });

        test('cria hash, inicia transacao, insere categorias e retorna novo usuario', async () => {
            Usuario.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashedpassword');
            Categoria.seedIniciais.mockResolvedValue(true);
            
            // Simula o comportamento do sequelize.transaction executando a callback que recebe
            sequelize.transaction.mockImplementation(async (callback) => {
                return await callback('fake_transaction');
            });

            // Mock do retorno do Usuario.create
            const mockNovoUser = {
                id: 99,
                nome: 'nome',
                email: 'teste@teste.com',
                senha: 'hashedpassword',
                toJSON: () => ({ id: 99, nome: 'nome', email: 'teste@teste.com', senha: 'hashedpassword' })
            };
            Usuario.create.mockResolvedValue(mockNovoUser);

            const result = await UsuarioService.criarUsuario('nome', 'teste@teste.com', 'senha');

            expect(bcrypt.hash).toHaveBeenCalledWith('senha', 10);
            expect(Usuario.create).toHaveBeenCalledWith(
                { nome: 'nome', email: 'teste@teste.com', senha: 'hashedpassword' },
                { transaction: 'fake_transaction' }
            );
            expect(Categoria.seedIniciais).toHaveBeenCalledWith(99, { transaction: 'fake_transaction' });
            expect(result).not.toHaveProperty('senha'); // não deve retornar senha
            expect(result.id).toBe(99);
        });
    });

    describe('loginUsuario', () => {
        test('lanca erro se usuario nao for encontrado', async () => {
            Usuario.findOne.mockResolvedValue(null);
            await expect(UsuarioService.loginUsuario('teste@teste.com', 'senha'))
                .rejects.toThrow('Usuario não encontrado');
        });

        test('lanca erro se a senha estiver incorreta', async () => {
            Usuario.findOne.mockResolvedValue({ id: 1, senha: 'hashed' });
            bcrypt.compare.mockResolvedValue(false);
            await expect(UsuarioService.loginUsuario('teste@teste.com', 'senha_errada'))
                .rejects.toThrow('email ou senha incorreta');
        });

        test('gera token JWT e retorna dados em sucesso', async () => {
            const mockUser = {
                id: 1,
                email: 'teste@teste.com',
                senha: 'hashed',
                toJSON: () => ({ id: 1, email: 'teste@teste.com', senha: 'hashed' })
            };
            Usuario.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mocked_jwt_token');

            const result = await UsuarioService.loginUsuario('teste@teste.com', 'senha_certa');

            expect(jwt.sign).toHaveBeenCalledWith({ id: 1 }, 'secret_test', { expiresIn: '1d' });
            expect(result.token).toBe('mocked_jwt_token');
            expect(result.usuario).not.toHaveProperty('senha');
        });
    });
});
