const UsuarioService = require('../UsuarioService');
const { Usuario, Categoria, sequelize } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../models');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('UsuarioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'chave-teste-secreta';
  });

  describe('criarUsuario', () => {
    test('cria usuário e chama seedIniciais obrigatoriamente', async () => {
      const usuarioMock = { id: 1, nome: 'Teste', email: 'teste@teste.com', toJSON: () => ({ id: 1, nome: 'Teste', email: 'teste@teste.com' }) };
      const transactionMock = jest.fn();

      sequelize.transaction.mockImplementation(async (callback) => {
        return callback(transactionMock);
      });

      Usuario.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hash-senha');
      Usuario.create.mockResolvedValue(usuarioMock);
      Categoria.seedIniciais = jest.fn().mockResolvedValue([]);

      await UsuarioService.criarUsuario('Teste', 'teste@teste.com', 'Senha123');

      expect(Categoria.seedIniciais).toHaveBeenCalledWith(1, { transaction: transactionMock });
    });

    test('falha se seedIniciais nao existir (seed obrigatório)', async () => {
      const usuarioMock = { id: 1, nome: 'Teste', email: 'teste@teste.com' };
      const transactionMock = jest.fn();

      sequelize.transaction.mockImplementation(async (callback) => {
        return callback(transactionMock);
      });

      Usuario.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hash-senha');
      Usuario.create.mockResolvedValue(usuarioMock);
      Categoria.seedIniciais = undefined;

      await expect(
        UsuarioService.criarUsuario('Teste', 'teste@teste.com', 'Senha123')
      ).rejects.toThrow();
    });

    test('retorna usuário sem senha no corpo da resposta', async () => {
      const usuarioMock = {
        id: 1,
        nome: 'Teste',
        email: 'teste@teste.com',
        senha: 'hash-senha',
        toJSON: () => ({ id: 1, nome: 'Teste', email: 'teste@teste.com', senha: 'hash-senha' }),
      };
      const transactionMock = jest.fn();

      sequelize.transaction.mockImplementation(async (callback) => {
        return callback(transactionMock);
      });

      Usuario.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hash-senha');
      Usuario.create.mockResolvedValue(usuarioMock);
      Categoria.seedIniciais = jest.fn().mockResolvedValue([]);

      const resultado = await UsuarioService.criarUsuario('Teste', 'teste@teste.com', 'Senha123');

      expect(resultado.senha).toBeUndefined();
      expect(resultado).not.toHaveProperty('senha');
    });

    test('rejeita email duplicado antes de criar usuário', async () => {
      const usuarioExistente = { id: 1, email: 'teste@teste.com' };
      Usuario.findOne.mockResolvedValue(usuarioExistente);

      await expect(
        UsuarioService.criarUsuario('Teste', 'teste@teste.com', 'Senha123')
      ).rejects.toThrow('Email já cadastrado');

      expect(Usuario.create).not.toHaveBeenCalled();
    });

    test('usa bcrypt para hash da senha', async () => {
      const usuarioMock = { id: 1, nome: 'Teste', email: 'teste@teste.com', toJSON: () => ({}) };
      const transactionMock = jest.fn();

      sequelize.transaction.mockImplementation(async (callback) => {
        return callback(transactionMock);
      });

      Usuario.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hash-gerado');
      Usuario.create.mockResolvedValue(usuarioMock);
      Categoria.seedIniciais = jest.fn().mockResolvedValue([]);

      await UsuarioService.criarUsuario('Teste', 'teste@teste.com', 'Senha123');

      expect(bcrypt.hash).toHaveBeenCalledWith('Senha123', 10);
      expect(Usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ senha: 'hash-gerado' }),
        expect.any(Object)
      );
    });
  });

  describe('loginUsuario', () => {
    test('retorna token e usuário sem senha em caso de sucesso', async () => {
      const usuarioMock = {
        id: 1,
        email: 'teste@teste.com',
        senha: 'hash-senha',
        toJSON: () => ({ id: 1, email: 'teste@teste.com' }),
      };

      Usuario.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(usuarioMock),
      });

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token-gerado');

      const resultado = await UsuarioService.loginUsuario('teste@teste.com', 'Senha123');

      expect(resultado.token).toBe('token-gerado');
      expect(resultado.usuario).toEqual({ id: 1, email: 'teste@teste.com' });
      expect(resultado.usuario.senha).toBeUndefined();
    });

    test('rejeita com 401 se credenciais forem incorretas', async () => {
      Usuario.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      await expect(
        UsuarioService.loginUsuario('teste@teste.com', 'SenhaErrada')
      ).rejects.toThrow('Usuario não encontrado');
    });

    test('rejeita com 401 se senha for inválida', async () => {
      const usuarioMock = {
        id: 1,
        email: 'teste@teste.com',
        senha: 'hash-senha',
      };

      Usuario.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(usuarioMock),
      });

      bcrypt.compare.mockResolvedValue(false);

      await expect(
        UsuarioService.loginUsuario('teste@teste.com', 'SenhaErrada')
      ).rejects.toThrow('email ou senha incorreta');
    });

    test('falha se JWT_SECRET nao estiver configurado', async () => {
      delete process.env.JWT_SECRET;

      const usuarioMock = {
        id: 1,
        email: 'teste@teste.com',
        senha: 'hash-senha',
        toJSON: () => ({ id: 1, email: 'teste@teste.com' }),
      };

      Usuario.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(usuarioMock),
      });

      bcrypt.compare.mockResolvedValue(true);

      await expect(
        UsuarioService.loginUsuario('teste@teste.com', 'Senha123')
      ).rejects.toThrow('Chave JWT_SECRET não configurada no servidor');

      process.env.JWT_SECRET = 'chave-teste-secreta';
    });

    test('usa JWT_SECRET correto para assinar token', async () => {
      const usuarioMock = {
        id: 1,
        email: 'teste@teste.com',
        senha: 'hash-senha',
        toJSON: () => ({ id: 1, email: 'teste@teste.com' }),
      };

      Usuario.scope = jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(usuarioMock),
      });

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token-gerado');

      await UsuarioService.loginUsuario('teste@teste.com', 'Senha123');

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        'chave-teste-secreta',
        { expiresIn: '1d' }
      );
    });
  });
});
