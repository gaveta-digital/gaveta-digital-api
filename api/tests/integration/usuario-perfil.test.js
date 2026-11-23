const path = require('path');
const os = require('os');
const fs = require('fs');

// banco só para este teste (definido antes de importar o app)
const IDENTIFICADOR = `${Date.now()}-${process.pid}`;
const DB_TEMP = path.join(os.tmpdir(), `gaveta-digital-perfil-${IDENTIFICADOR}.sqlite`);

process.env.DB_STORAGE = DB_TEMP;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-integracao';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, Usuario } = require('../../src/models');

const SETE_DIAS_EM_SEGUNDOS = 7 * 24 * 60 * 60;

async function criarUsuario(email, nome) {
  await request(app).post('/api/usuarios').send({ nome, email, senha: 'Senha123' });

  const login = await request(app).post('/api/login').send({ email, senha: 'Senha123' });

  return {
    id: login.body.data.usuario.id,
    token: login.body.data.token,
  };
}

const autorizacao = (token) => ({ Authorization: `Bearer ${token}` });

async function lerPerfil(token) {
  const resposta = await request(app).get('/api/usuarios/me').set(autorizacao(token));
  return resposta.body.data;
}

describe('Integração — perfil do usuário (GET e PATCH /usuarios/me)', () => {
  let ana;
  let bruno;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    ana = await criarUsuario('ana@teste.com', 'Ana Souza');
    bruno = await criarUsuario('bruno@teste.com', 'Bruno Lima');
  });

  afterAll(async () => {
    await sequelize.close();
    fs.rmSync(DB_TEMP, { force: true });
  });

  test('o token do login vale 7 dias', () => {
    const { iat, exp } = jwt.decode(ana.token);
    expect(exp - iat).toBe(SETE_DIAS_EM_SEGUNDOS);
  });

  describe('GET /usuarios/me', () => {
    test('retorna só id, nome e email do usuário do token', async () => {
      const resposta = await request(app).get('/api/usuarios/me').set(autorizacao(ana.token));

      expect(resposta.status).toBe(200);
      expect(resposta.body.data).toEqual({
        id: ana.id,
        nome: 'Ana Souza',
        email: 'ana@teste.com',
      });
    });

    test('nunca retorna senha nem hash', async () => {
      const resposta = await request(app).get('/api/usuarios/me').set(autorizacao(ana.token));

      expect(JSON.stringify(resposta.body)).not.toMatch(/senha|\$2[aby]\$/i);
    });

    test.each([
      ['sem token', {}],
      ['com token inválido', autorizacao('token-invalido')],
    ])('%s retorna 401', async (_descricao, cabecalhos) => {
      const resposta = await request(app).get('/api/usuarios/me').set(cabecalhos);

      expect(resposta.status).toBe(401);
    });

    test('token expirado retorna 401', async () => {
      const expirado = jwt.sign({ id: ana.id }, process.env.JWT_SECRET, { expiresIn: -10 });

      const resposta = await request(app).get('/api/usuarios/me').set(autorizacao(expirado));

      expect(resposta.status).toBe(401);
    });
  });

  describe('PATCH /usuarios/me', () => {
    test('altera o nome, aplica trim e grava no banco', async () => {
      const resposta = await request(app)
        .patch('/api/usuarios/me')
        .set(autorizacao(ana.token))
        .send({ nome: "  Maria D'Ávila " });

      expect(resposta.status).toBe(200);
      expect(resposta.body.data).toEqual({
        id: ana.id,
        nome: "Maria D'Ávila",
        email: 'ana@teste.com',
      });

      expect((await lerPerfil(ana.token)).nome).toBe("Maria D'Ávila");
      expect((await Usuario.findByPk(ana.id)).nome).toBe("Maria D'Ávila");
    });

    test('a alteração de um usuário não afeta outro', async () => {
      expect((await lerPerfil(bruno.token)).nome).toBe('Bruno Lima');
    });

    test.each([
      ['corpo vazio', {}],
      ['só o email', { email: 'outro@teste.com' }],
      ['nome com email', { nome: 'Ana', email: 'outro@teste.com' }],
      ['nome com senha', { nome: 'Ana', senha: 'Abcdefg1' }],
      ['nome com id', { nome: 'Ana', id: '00000000-0000-4000-8000-000000000000' }],
      ['nome null', { nome: null }],
      ['nome vazio', { nome: '' }],
      ['nome só com espaços', { nome: '   ' }],
      ['nome com 1 letra', { nome: 'A' }],
      ['nome com número', { nome: 'Maria 2026' }],
      ['nome sem nenhuma letra', { nome: '--' }],
      ['nome com 101 caracteres', { nome: 'a'.repeat(101) }],
      ['nome numérico', { nome: 123 }],
      ['nome em lista', { nome: ['Ana'] }],
      ['nome em objeto', { nome: { valor: 'Ana' } }],
    ])('%s retorna 400 e não altera nada', async (_descricao, corpo) => {
      const antes = await lerPerfil(ana.token);

      const resposta = await request(app)
        .patch('/api/usuarios/me')
        .set(autorizacao(ana.token))
        .send(corpo);

      expect(resposta.status).toBe(400);
      expect(typeof resposta.body.erro).toBe('string');
      expect(await lerPerfil(ana.token)).toEqual(antes);
    });

    test('corpo em formato de lista retorna 400', async () => {
      const resposta = await request(app)
        .patch('/api/usuarios/me')
        .set(autorizacao(ana.token))
        .set('Content-Type', 'application/json')
        .send('[]');

      expect(resposta.status).toBe(400);
    });

    test('sem token retorna 401 e não altera nada', async () => {
      const resposta = await request(app).patch('/api/usuarios/me').send({ nome: 'Invasor' });

      expect(resposta.status).toBe(401);
      expect((await lerPerfil(ana.token)).nome).toBe("Maria D'Ávila");
    });
  });

  describe('usuário que não existe mais', () => {
    test('GET e PATCH com o token dele retornam 401', async () => {
      const removido = await criarUsuario('removido@teste.com', 'Carlos Dias');
      await Usuario.destroy({ where: { id: removido.id }, force: true });

      const consulta = await request(app).get('/api/usuarios/me').set(autorizacao(removido.token));
      const edicao = await request(app)
        .patch('/api/usuarios/me')
        .set(autorizacao(removido.token))
        .send({ nome: 'Fantasma' });

      expect(consulta.status).toBe(401);
      expect(edicao.status).toBe(401);
    });
  });
});
