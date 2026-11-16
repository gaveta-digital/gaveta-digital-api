const path = require('path');
const os = require('os');
const fs = require('fs');

// banco e pasta de upload só pra este teste (definidos antes de importar o app)
const IDENTIFICADOR = `${Date.now()}-${process.pid}`;
const DB_TEMP = path.join(os.tmpdir(), `gaveta-digital-integracao-${IDENTIFICADOR}.sqlite`);
const DATA_TEMP = path.join(os.tmpdir(), `gaveta-digital-integracao-data-${IDENTIFICADOR}`);

process.env.DB_STORAGE = DB_TEMP;
process.env.DATA_DIR = DATA_TEMP;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-integracao';
process.env.GEMINI_API_KEY = 'chave-de-integracao';

// gemini simulado, nenhuma chamada real
const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Comprovante } = require('../../src/models');

function respostaGemini(objeto) {
  return {
    response: { text: () => JSON.stringify(objeto) },
  };
}

// png de 1 pixel, só pra ter uma imagem válida
const IMAGEM_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function criarUsuarioEToken(email) {
  await request(app).post('/api/usuarios').send({
    nome: 'Usuário de Teste',
    email,
    senha: 'Senha123',
  });

  const login = await request(app)
    .post('/api/login')
    .send({ email, senha: 'Senha123' });

  return login.body.data.token;
}

function anexarImagem(requisicao, nomeArquivo = 'recibo.png') {
  return requisicao.attach('imagem', IMAGEM_PNG, {
    filename: nomeArquivo,
    contentType: 'image/png',
  });
}

describe('Integração — fluxo completo de Comprovantes', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
    fs.rmSync(DB_TEMP, { force: true });
    fs.rmSync(DATA_TEMP, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rota inexistente retorna 404 no formato padrão { erro }', async () => {
    const resposta = await request(app).get('/api/rota-que-nao-existe');

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: 'Rota não encontrada' });
  });

  test('edição do comprovante é PATCH: PUT não existe mais', async () => {
    const token = await criarUsuarioEToken('verbo-http@teste.com');

    const resposta = await request(app)
      .put('/api/comprovantes/qualquer-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ valor: 10 });

    expect(resposta.status).toBe(404);
  });

  test('fluxo completo: upload real -> IA -> salva no banco -> 201', async () => {
    const token = await criarUsuarioEToken('fluxo-completo@teste.com');

    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: 'Mercado Integração',
      data: '2026-09-20',
      valor: 25.9,
      categoriaId: null,
    }));

    const resposta = await anexarImagem(
      request(app).post('/api/comprovantes').set('Authorization', `Bearer ${token}`)
    );

    expect(resposta.status).toBe(201);
    expect(resposta.body.data.estabelecimento).toBe('Mercado Integração');
    expect(resposta.body.data.valor).toBe(25.9);
    expect(resposta.body.data.categoriaId).toEqual(expect.any(String));

    const salvo = await Comprovante.findByPk(resposta.body.data.id);
    expect(salvo).not.toBeNull();
    expect(salvo.estabelecimento).toBe('Mercado Integração');
  });

  test('campos null retornados pela IA não quebram o fluxo e retornam 201', async () => {
    const token = await criarUsuarioEToken('campos-nulos@teste.com');

    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: null,
    }));

    const resposta = await anexarImagem(
      request(app).post('/api/comprovantes').set('Authorization', `Bearer ${token}`)
    );

    expect(resposta.status).toBe(201);
    expect(resposta.body.data.estabelecimento).toBeNull();
    expect(resposta.body.data.data).toBeNull();
    expect(resposta.body.data.valor).toBeNull();
    // sem categoria da ia, cai em "Outros"
    expect(resposta.body.data.categoriaId).toEqual(expect.any(String));
  });

  test('imagem ilegível retorna 422 e nenhum comprovante é criado', async () => {
    const token = await criarUsuarioEToken('imagem-ilegivel@teste.com');

    mockGenerateContent.mockResolvedValueOnce(
      respostaGemini({ erro: 'imagem ilegível' })
    );

    const antes = await Comprovante.count();

    const resposta = await anexarImagem(
      request(app).post('/api/comprovantes').set('Authorization', `Bearer ${token}`)
    );

    expect(resposta.status).toBe(422);

    const depois = await Comprovante.count();
    expect(depois).toBe(antes);
  });

  test('falha do Gemini retorna 503 e a API continua funcionando depois', async () => {
    const token = await criarUsuarioEToken('gemini-indisponivel@teste.com');

    mockGenerateContent.mockRejectedValueOnce(new Error('timeout simulado'));

    const antes = await Comprovante.count();

    const resposta = await anexarImagem(
      request(app).post('/api/comprovantes').set('Authorization', `Bearer ${token}`)
    );

    expect(resposta.status).toBe(503);

    const depois = await Comprovante.count();
    expect(depois).toBe(antes);

    // a api continua funcionando depois da falha
    const saude = await request(app).get('/api/teste');
    expect(saude.status).toBe(200);
  });

  describe('isolamento entre usuários', () => {
    let tokenA;
    let tokenB;
    let comprovanteId;

    beforeEach(async () => {
      tokenA = await criarUsuarioEToken(`usuario-a-${Date.now()}@teste.com`);
      tokenB = await criarUsuarioEToken(`usuario-b-${Date.now()}@teste.com`);

      mockGenerateContent.mockResolvedValueOnce(respostaGemini({
        estabelecimento: 'Loja do Usuário A',
        data: null,
        valor: null,
        categoriaId: null,
      }));

      const criado = await anexarImagem(
        request(app).post('/api/comprovantes').set('Authorization', `Bearer ${tokenA}`)
      );
      comprovanteId = criado.body.data.id;
    });

    test('usuário B não consegue ver o comprovante do usuário A (403)', async () => {
      const resposta = await request(app)
        .get(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resposta.status).toBe(403);
    });

    test('usuário B não consegue editar o comprovante do usuário A (403)', async () => {
      const resposta = await request(app)
        .patch(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ valor: 10 });

      expect(resposta.status).toBe(403);

      const inalterado = await Comprovante.findByPk(comprovanteId);
      expect(Number(inalterado.valor)).not.toBe(10);
    });

    test('usuário B não consegue excluir o comprovante do usuário A (403)', async () => {
      const resposta = await request(app)
        .delete(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resposta.status).toBe(403);

      const aindaExiste = await Comprovante.findByPk(comprovanteId);
      expect(aindaExiste).not.toBeNull();
    });

    test('usuário B não consegue ver a imagem do comprovante do usuário A (403)', async () => {
      const resposta = await request(app)
        .get(`/api/comprovantes/${comprovanteId}/imagem`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resposta.status).toBe(403);
    });

    test('o dono (usuário A) consegue ver seu próprio comprovante (200)', async () => {
      const resposta = await request(app)
        .get(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.id).toBe(comprovanteId);
    });
  });

  describe('validação manual — edge cases de regras-de-negocio.md', () => {
    let token;
    let comprovanteId;

    beforeEach(async () => {
      token = await criarUsuarioEToken(`edge-cases-${Date.now()}@teste.com`);

      mockGenerateContent.mockResolvedValueOnce(respostaGemini({
        estabelecimento: null,
        data: null,
        valor: null,
        categoriaId: null,
      }));

      const criado = await anexarImagem(
        request(app).post('/api/comprovantes').set('Authorization', `Bearer ${token}`)
      );
      comprovanteId = criado.body.data.id;
    });

    test('valor negativo na edição manual é rejeitado com 400', async () => {
      const resposta = await request(app)
        .patch(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ valor: -10 });

      expect(resposta.status).toBe(400);

      const inalterado = await Comprovante.findByPk(comprovanteId);
      expect(inalterado.valor).toBeNull();
    });

    test('data futura na edição manual é rejeitada com 400', async () => {
      const resposta = await request(app)
        .patch(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: '2999-01-01' });

      expect(resposta.status).toBe(400);

      const inalterado = await Comprovante.findByPk(comprovanteId);
      expect(inalterado.data).toBeNull();
    });

    test('campos null explícitos são aceitos na edição manual sem quebrar o fluxo', async () => {
      const resposta = await request(app)
        .patch(`/api/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estabelecimento: null, data: null, valor: null });

      expect(resposta.status).toBe(200);
      expect(resposta.body.data.estabelecimento).toBeNull();
      expect(resposta.body.data.data).toBeNull();
      expect(resposta.body.data.valor).toBeNull();
    });
  });
});
