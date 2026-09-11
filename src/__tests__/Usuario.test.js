const request = require('supertest');
const app = require('../app'); // Aponta para o arquivo app.js
const Usuario = require('../models/Usuario');

describe('Testes de Usuário e Autenticação', () => {
  // Antes de rodar os testes,"limpamos" o banco de dados (no ambiente de testes)
    beforeAll(async () => {
        await Usuario.sequelize.sync({ force: true });
    });

  // Fecha a conexão com o banco após os testes para o processo não ficar travado
    afterAll(async () => {
        await Usuario.sequelize.close();
    });

  // 1. Cadastro com dados válidos → 201
    it('Deve cadastrar um usuário com dados válidos (Status 201)', async () => {
        const response = await request(app)
        .post('/api/usuarios')
        .send({
            nome: "João Testador",
            email: "joao.teste@gaveta.com",
            senha: "SenhaForte123"
        });

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.email).toBe('joao.teste@gaveta.com');
    });

  // 2. Cadastro com e-mail já existente → 409
    it('Deve retornar 409 ao tentar cadastrar e-mail já existente', async () => {
        const response = await request(app)
        .post('/api/usuarios')
        .send({
            nome: "João Clone",
            email: "joao.teste@gaveta.com", // Mesmo email do teste anterior
            senha: "SenhaForte123"
        });

        expect(response.status).toBe(409);
        expect(response.body.mensagem).toBe('Email já cadastrado');
    });

  // 3. Login com senha errada → 401
    it('Deve retornar 401 ao fazer login com senha errada', async () => {
        const response = await request(app)
        .post('/api/login')
        .send({
            email: "joao.teste@gaveta.com",
            senha: "senha_errada_aqui"
        });

        expect(response.status).toBe(401);
        expect(response.body.mensagem).toBe('Email ou senha incorreta');
    });

  // 4. Login com sucesso → retorna token válido
    it('Deve retornar o token JWT ao fazer login com sucesso', async () => {
        const response = await request(app)
        .post('/api/login')
        .send({
            email: "joao.teste@gaveta.com",
            senha: "SenhaForte123"
        });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('token');
        // Verifica se o token tem o formato de três partes separadas por ponto (padrão do JWT)
        expect(response.body.data.token.split('.').length).toBe(3); 
    });
});