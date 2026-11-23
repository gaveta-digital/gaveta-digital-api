const path = require('path');
const os = require('os');
const fs = require('fs');

// banco e pasta de upload só pra este teste (definidos antes de importar o app)
const IDENTIFICADOR = `${Date.now()}-${process.pid}`;
const DB_TEMP = path.join(os.tmpdir(), `gaveta-digital-uso-ia-${IDENTIFICADOR}.sqlite`);
const DATA_TEMP = path.join(os.tmpdir(), `gaveta-digital-uso-ia-data-${IDENTIFICADOR}`);

process.env.DB_STORAGE = DB_TEMP;
process.env.DATA_DIR = DATA_TEMP;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-integracao';
process.env.IA_API_KEY = 'chave-de-integracao';
delete process.env.IA_BASE_URL;
delete process.env.IA_MODELOS;

// IA simulada: o fetch global é substituído, nenhuma chamada real ao provedor
const mockFetch = jest.fn();
global.fetch = mockFetch;

const request = require('supertest');
const app = require('../../src/app');
const { sequelize, UsoIA, Comprovante } = require('../../src/models');

const MODELO_PADRAO = 'qwen/qwen3.8-27b';

// resposta do provedor no formato da OpenAI, com o consumo de tokens em usage
function respostaIA(objeto, usage = { prompt_tokens: 2000, completion_tokens: 65, total_tokens: 2065 }) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(objeto) } }], usage }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

const LEITURA_OK = { estabelecimento: 'Mercado Central', data: '2026-09-14', valor: 42.5, categoriaId: null };

const IMAGEM_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

let contadorDeUsuarios = 0;

async function criarUsuarioEToken() {
  contadorDeUsuarios += 1;
  const email = `uso-ia-${IDENTIFICADOR}-${contadorDeUsuarios}@teste.com`;

  await request(app).post('/api/usuarios').send({ nome: 'Usuário de Teste', email, senha: 'Senha123' });
  const login = await request(app).post('/api/login').send({ email, senha: 'Senha123' });

  return { token: login.body.data.token, usuarioId: login.body.data.usuario.id };
}

const autorizacao = (token) => ({ Authorization: `Bearer ${token}` });

function enviarComprovante(token) {
  return request(app)
    .post('/api/comprovantes')
    .set(autorizacao(token))
    .attach('imagem', IMAGEM_PNG, { filename: 'recibo.png', contentType: 'image/png' });
}

async function lerUso(token) {
  const resposta = await request(app).get('/api/uso-ia').set(autorizacao(token));
  expect(resposta.status).toBe(200);
  return resposta.body.data;
}

describe('Integração — uso da IA (GET /api/uso-ia e UsoIA)', () => {
  let espiaoConsole;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
    fs.rmSync(DB_TEMP, { force: true });
    fs.rmSync(DATA_TEMP, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockFetch.mockReset();
    delete process.env.IA_MODELOS;
    espiaoConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    espiaoConsole.mockRestore();
    jest.restoreAllMocks();
  });

  describe('autenticação', () => {
    test.each([
      ['sem token', {}],
      ['com token inválido', autorizacao('token-invalido')],
    ])('%s retorna 401', async (_descricao, cabecalhos) => {
      const resposta = await request(app).get('/api/uso-ia').set(cabecalhos);

      expect(resposta.status).toBe(401);
    });
  });

  test('usuário sem leituras recebe zeros e listas vazias', async () => {
    const { token } = await criarUsuarioEToken();

    expect(await lerUso(token)).toEqual({
      totalTentativas: 0,
      tokensEntrada: 0,
      tokensSaida: 0,
      tokensTotal: 0,
      porModelo: [],
      ultimas: [],
    });
  });

  test('leitura com sucesso grava a tentativa e liga o comprovante criado', async () => {
    const { token, usuarioId } = await criarUsuarioEToken();
    mockFetch.mockResolvedValueOnce(respostaIA(LEITURA_OK));

    const criado = await enviarComprovante(token);
    expect(criado.status).toBe(201);

    const uso = await lerUso(token);

    expect(uso).toMatchObject({
      totalTentativas: 1,
      tokensEntrada: 2000,
      tokensSaida: 65,
      tokensTotal: 2065,
      porModelo: [
        { modelo: MODELO_PADRAO, tentativas: 1, tokensEntrada: 2000, tokensSaida: 65, tokensTotal: 2065 },
      ],
    });
    expect(uso.ultimas).toHaveLength(1);
    expect(uso.ultimas[0]).toMatchObject({
      modelo: MODELO_PADRAO,
      resultado: 'sucesso',
      tokensEntrada: 2000,
      tokensSaida: 65,
      tokensTotal: 2065,
      comprovanteId: criado.body.data.id,
    });
    expect(Number.isInteger(uso.ultimas[0].duracaoMs)).toBe(true);
    expect(uso.ultimas[0].duracaoMs).toBeGreaterThanOrEqual(0);

    // o registro pertence ao usuário que enviou a imagem
    const registros = await UsoIA.findAll({ where: { usuarioId } });
    expect(registros).toHaveLength(1);
  });

  test('a resposta não expõe o usuário nem outros campos internos', async () => {
    const { token } = await criarUsuarioEToken();
    mockFetch.mockResolvedValueOnce(respostaIA(LEITURA_OK));
    await enviarComprovante(token);

    const uso = await lerUso(token);

    expect(Object.keys(uso.ultimas[0]).sort()).toEqual([
      'comprovanteId',
      'criadoEm',
      'duracaoMs',
      'id',
      'modelo',
      'resultado',
      'tokensEntrada',
      'tokensSaida',
      'tokensTotal',
    ]);
  });

  test('imagem ilegível (422) grava a tentativa sem comprovante, com os tokens gastos', async () => {
    const { token } = await criarUsuarioEToken();
    mockFetch.mockResolvedValueOnce(
      respostaIA({ erro: 'imagem ilegível' }, { prompt_tokens: 1900, completion_tokens: 12, total_tokens: 1912 })
    );

    const resposta = await enviarComprovante(token);
    expect(resposta.status).toBe(422);

    const uso = await lerUso(token);

    expect(uso.totalTentativas).toBe(1);
    expect(uso.tokensTotal).toBe(1912);
    expect(uso.ultimas[0]).toMatchObject({
      resultado: 'ilegivel',
      comprovanteId: null,
      tokensEntrada: 1900,
      tokensSaida: 12,
      tokensTotal: 1912,
    });
  });

  test('modelo fora do ar e o seguinte funcionando: duas tentativas, só a última ligada ao comprovante', async () => {
    process.env.IA_MODELOS = 'modelo-a,modelo-b';
    const { token } = await criarUsuarioEToken();
    mockFetch
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(respostaIA(LEITURA_OK));

    const criado = await enviarComprovante(token);
    expect(criado.status).toBe(201);

    const uso = await lerUso(token);
    const porModelo = Object.fromEntries(uso.porModelo.map((linha) => [linha.modelo, linha]));
    const tentativa = (modelo) => uso.ultimas.find((registro) => registro.modelo === modelo);

    expect(uso.totalTentativas).toBe(2);
    expect(uso.tokensTotal).toBe(2065);
    expect(porModelo['modelo-a']).toMatchObject({ tentativas: 1, tokensTotal: 0 });
    expect(porModelo['modelo-b']).toMatchObject({ tentativas: 1, tokensTotal: 2065 });
    expect(tentativa('modelo-a')).toMatchObject({ resultado: 'erro', comprovanteId: null, tokensTotal: 0 });
    expect(tentativa('modelo-b')).toMatchObject({
      resultado: 'sucesso',
      comprovanteId: criado.body.data.id,
      tokensTotal: 2065,
    });
  });

  test('falha de rede (503): grava a tentativa de erro com tokens 0', async () => {
    const { token } = await criarUsuarioEToken();
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const resposta = await enviarComprovante(token);
    expect(resposta.status).toBe(503);

    const uso = await lerUso(token);
    expect(uso.totalTentativas).toBe(1);
    expect(uso.tokensTotal).toBe(0);
    expect(uso.ultimas[0]).toMatchObject({ resultado: 'erro', comprovanteId: null, tokensTotal: 0 });
  });

  test('conteúdo da IA que não é JSON (503): "erro", mas com os tokens cobrados pelo provedor', async () => {
    const { token } = await criarUsuarioEToken();
    mockFetch.mockResolvedValueOnce(
      respostaIA('resposta sem formato', { prompt_tokens: 2000, completion_tokens: 20, total_tokens: 2020 })
    );

    const resposta = await enviarComprovante(token);
    expect(resposta.status).toBe(503);

    const uso = await lerUso(token);
    expect(uso.ultimas[0]).toMatchObject({ resultado: 'erro', comprovanteId: null, tokensTotal: 2020 });
  });

  test('os totais somam todas as tentativas do usuário', async () => {
    const { token } = await criarUsuarioEToken();
    mockFetch
      .mockResolvedValueOnce(respostaIA(LEITURA_OK, { prompt_tokens: 2000, completion_tokens: 65, total_tokens: 2065 }))
      .mockResolvedValueOnce(respostaIA({ erro: 'imagem ilegível' }, { prompt_tokens: 1900, completion_tokens: 12, total_tokens: 1912 }))
      .mockResolvedValueOnce(respostaIA(LEITURA_OK, { prompt_tokens: 2100, completion_tokens: 70, total_tokens: 2170 }));

    await enviarComprovante(token);
    await enviarComprovante(token);
    await enviarComprovante(token);

    const uso = await lerUso(token);

    expect(uso).toMatchObject({
      totalTentativas: 3,
      tokensEntrada: 6000,
      tokensSaida: 147,
      tokensTotal: 6147,
    });
    expect(uso.porModelo).toEqual([
      { modelo: MODELO_PADRAO, tentativas: 3, tokensEntrada: 6000, tokensSaida: 147, tokensTotal: 6147 },
    ]);
  });

  test('cada usuário vê só o próprio uso (isolamento)', async () => {
    const ana = await criarUsuarioEToken();
    const bruno = await criarUsuarioEToken();
    mockFetch
      .mockResolvedValueOnce(respostaIA(LEITURA_OK))
      .mockResolvedValueOnce(respostaIA(LEITURA_OK))
      .mockResolvedValueOnce(respostaIA(LEITURA_OK, { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }));

    await enviarComprovante(ana.token);
    await enviarComprovante(ana.token);
    await enviarComprovante(bruno.token);

    const usoAna = await lerUso(ana.token);
    const usoBruno = await lerUso(bruno.token);

    expect(usoAna.totalTentativas).toBe(2);
    expect(usoAna.tokensTotal).toBe(4130);
    expect(usoBruno.totalTentativas).toBe(1);
    expect(usoBruno.tokensTotal).toBe(15);

    // nenhuma tentativa de um aparece na lista do outro
    const idsDaAna = new Set(usoAna.ultimas.map((registro) => registro.id));
    expect(usoBruno.ultimas.some((registro) => idsDaAna.has(registro.id))).toBe(false);
    expect(usoAna.ultimas.some((registro) => registro.comprovanteId === usoBruno.ultimas[0].comprovanteId)).toBe(false);
  });

  test('excluir o comprovante mantém o registro de uso e deixa o comprovanteId nulo', async () => {
    const { token, usuarioId } = await criarUsuarioEToken();
    mockFetch.mockResolvedValueOnce(respostaIA(LEITURA_OK));
    const criado = await enviarComprovante(token);

    const antes = await lerUso(token);
    expect(antes.ultimas[0].comprovanteId).toBe(criado.body.data.id);

    const exclusao = await request(app)
      .delete(`/api/comprovantes/${criado.body.data.id}`)
      .set(autorizacao(token));
    expect(exclusao.status).toBe(204);

    expect(await Comprovante.findByPk(criado.body.data.id)).toBeNull();

    const depois = await lerUso(token);
    expect(depois.totalTentativas).toBe(1);
    expect(depois.tokensTotal).toBe(2065);
    expect(depois.ultimas[0].comprovanteId).toBeNull();
    expect(await UsoIA.count({ where: { usuarioId } })).toBe(1);
  });

  test('devolve no máximo as 10 últimas, da mais recente para a mais antiga', async () => {
    const { token, usuarioId } = await criarUsuarioEToken();

    for (let i = 1; i <= 12; i += 1) {
      const registro = await UsoIA.create({
        usuarioId,
        modelo: `modelo-${String(i).padStart(2, '0')}`,
        tokensEntrada: 10,
        tokensSaida: 1,
        tokensTotal: 11,
        duracaoMs: 100,
        resultado: 'sucesso',
      });
      // datas distintas e crescentes, para a ordem não depender do relógio
      await UsoIA.update(
        { createdAt: new Date(Date.UTC(2026, 10, 1, 12, i)) },
        { where: { id: registro.id }, silent: true }
      );
    }

    const uso = await lerUso(token);

    expect(uso.totalTentativas).toBe(12);
    expect(uso.porModelo).toHaveLength(12);
    expect(uso.ultimas).toHaveLength(10);
    expect(uso.ultimas.map((registro) => registro.modelo)).toEqual([
      'modelo-12', 'modelo-11', 'modelo-10', 'modelo-09', 'modelo-08',
      'modelo-07', 'modelo-06', 'modelo-05', 'modelo-04', 'modelo-03',
    ]);
  });

  test('falha ao gravar o uso não impede nem desfaz a criação do comprovante', async () => {
    const { token } = await criarUsuarioEToken();
    mockFetch.mockResolvedValueOnce(respostaIA(LEITURA_OK));
    jest.spyOn(UsoIA, 'bulkCreate').mockRejectedValueOnce(new Error('banco fora do ar'));

    const resposta = await enviarComprovante(token);

    expect(resposta.status).toBe(201);
    expect(await Comprovante.findByPk(resposta.body.data.id)).not.toBeNull();
    expect(espiaoConsole).toHaveBeenCalledWith(
      expect.stringContaining('Não foi possível gravar o uso da IA'),
      'banco fora do ar'
    );

    // sem o registro que falhou, o resumo continua respondendo normalmente
    expect((await lerUso(token)).totalTentativas).toBe(0);
  });
});
