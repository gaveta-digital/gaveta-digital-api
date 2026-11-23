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
process.env.IA_API_KEY = 'chave-de-integracao';
delete process.env.IA_BASE_URL;
delete process.env.IA_MODELOS;

// IA simulada: o fetch global é substituído, nenhuma chamada real ao provedor.
// (o supertest usa o módulo http, então não é afetado)
const mockFetch = jest.fn();
global.fetch = mockFetch;

const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Comprovante } = require('../../src/models');

// resposta do provedor no formato da OpenAI: o JSON da IA vem em choices[0].message.content
function respostaIA(objeto) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(objeto) } }],
      usage: { prompt_tokens: 2000, completion_tokens: 65, total_tokens: 2065 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
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

    mockFetch.mockResolvedValueOnce(respostaIA({
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

    mockFetch.mockResolvedValueOnce(respostaIA({
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

    mockFetch.mockResolvedValueOnce(
      respostaIA({ erro: 'imagem ilegível' })
    );

    const antes = await Comprovante.count();

    const resposta = await anexarImagem(
      request(app).post('/api/comprovantes').set('Authorization', `Bearer ${token}`)
    );

    expect(resposta.status).toBe(422);

    const depois = await Comprovante.count();
    expect(depois).toBe(antes);
  });

  test('falha da IA retorna 503 e a API continua funcionando depois', async () => {
    const token = await criarUsuarioEToken('ia-indisponivel@teste.com');

    mockFetch.mockRejectedValueOnce(new Error('timeout simulado'));

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

      mockFetch.mockResolvedValueOnce(respostaIA({
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

      mockFetch.mockResolvedValueOnce(respostaIA({
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

  describe('filtro, busca e resumo do mês (Etapa 2)', () => {
    async function obterCategorias(tokenUsuario) {
      const resposta = await request(app)
        .get('/api/categorias')
        .set('Authorization', `Bearer ${tokenUsuario}`);
      return resposta.body;
    }

    async function criarComprovante(tokenUsuario, {
      estabelecimento = null,
      data = null,
      valor = null,
      categoriaId = null,
      observacoes,
    } = {}) {
      mockFetch.mockResolvedValueOnce(respostaIA({
        estabelecimento,
        data,
        valor,
        categoriaId,
      }));

      const criado = await anexarImagem(
        request(app).post('/api/comprovantes').set('Authorization', `Bearer ${tokenUsuario}`)
      );

      if (observacoes !== undefined) {
        await request(app)
          .patch(`/api/comprovantes/${criado.body.data.id}`)
          .set('Authorization', `Bearer ${tokenUsuario}`)
          .send({ observacoes });
      }

      return criado.body.data;
    }

    describe('filtro por categoria e busca', () => {
      let token;
      let categoriaMaterial;
      let categoriaAlimentacao;

      beforeEach(async () => {
        token = await criarUsuarioEToken(`filtro-busca-${Date.now()}@teste.com`);
        const categorias = await obterCategorias(token);
        categoriaMaterial = categorias.find((categoria) => categoria.nome === 'Material');
        categoriaAlimentacao = categorias.find((categoria) => categoria.nome === 'Alimentação');

        await criarComprovante(token, {
          estabelecimento: 'Mercado Central',
          categoriaId: categoriaMaterial.id,
          observacoes: 'compra de parafusos',
        });
        await criarComprovante(token, {
          estabelecimento: 'Padaria do Bairro',
          categoriaId: categoriaAlimentacao.id,
        });
        await criarComprovante(token, {
          estabelecimento: 'Outro estabelecimento',
          categoriaId: categoriaMaterial.id,
          observacoes: 'nada a ver',
        });
      });

      test('filtra por categoriaId retornando apenas comprovantes dela', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ categoriaId: categoriaAlimentacao.id })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].estabelecimento).toBe('Padaria do Bairro');
      });

      test('categoriaId de outro usuário retorna 400', async () => {
        const outroToken = await criarUsuarioEToken(`outro-usuario-cat-${Date.now()}@teste.com`);
        const categoriasDoOutro = await obterCategorias(outroToken);
        const categoriaDoOutro = categoriasDoOutro.find((categoria) => categoria.nome === 'Material');

        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ categoriaId: categoriaDoOutro.id })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(400);
      });

      test('categoriaId inexistente retorna 400', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ categoriaId: 'id-que-nao-existe' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(400);
      });

      test.each([
        ['fora do formato UUID', 'abc'],
        ['fora do formato UUID', 'id-que-nao-existe'],
        ['vazio', ''],
      ])('categoriaId %s ("%s") retorna 400', async (_caso, categoriaId) => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ categoriaId })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(400);
      });

      test('busca por estabelecimento, sem diferenciar maiúsculas e minúsculas', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: 'MERCADO' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].estabelecimento).toBe('Mercado Central');
      });

      test('busca ignora maiúsculas e minúsculas também em letras acentuadas', async () => {
        await criarComprovante(token, {
          estabelecimento: 'CAFÉ DO ZÉ',
          categoriaId: categoriaAlimentacao.id,
        });
        await criarComprovante(token, {
          estabelecimento: 'Padaria São João',
          categoriaId: categoriaAlimentacao.id,
          observacoes: 'AÇAÍ com granola',
        });

        const buscar = async (busca) => {
          const resposta = await request(app)
            .get('/api/comprovantes')
            .query({ busca })
            .set('Authorization', `Bearer ${token}`);

          expect(resposta.status).toBe(200);
          return resposta.body.data.map((item) => item.estabelecimento);
        };

        // texto salvo em caixa alta, busca em minúsculas
        expect(await buscar('café')).toEqual(['CAFÉ DO ZÉ']);
        // texto salvo em minúsculas/misto, busca em caixa alta
        expect(await buscar('SÃO JOÃO')).toEqual(['Padaria São João']);
        // observações com letras acentuadas em caixa alta
        expect(await buscar('açaí')).toEqual(['Padaria São João']);
      });

      test('busca por observações', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: 'parafusos' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].estabelecimento).toBe('Mercado Central');
      });

      test('busca sem resultado retorna lista vazia', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: 'inexistente-xyz' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toEqual([]);
      });

      test('busca com mais de 100 caracteres retorna 400', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: 'A'.repeat(101) })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(400);
      });

      test('combina categoriaId, busca e paginação', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({
            categoriaId: categoriaMaterial.id,
            busca: 'estabelecimento',
            pagina: 1,
            limite: 1,
          })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].estabelecimento).toBe('Outro estabelecimento');
      });

      test('busca escapa % para não funcionar como wildcard, casando só o caractere literal', async () => {
        await criarComprovante(token, {
          estabelecimento: 'Desconto 50% Off',
          categoriaId: categoriaMaterial.id,
        });

        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: '%' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].estabelecimento).toBe('Desconto 50% Off');
      });

      test('busca escapa _ para não funcionar como wildcard, casando só o caractere literal', async () => {
        await criarComprovante(token, {
          estabelecimento: 'Loja_Especial',
          categoriaId: categoriaMaterial.id,
        });

        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: '_' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].estabelecimento).toBe('Loja_Especial');
      });

      test('filtro e busca são isolados por usuário', async () => {
        const outroToken = await criarUsuarioEToken(`isolamento-busca-${Date.now()}@teste.com`);

        const resposta = await request(app)
          .get('/api/comprovantes')
          .query({ busca: 'Mercado' })
          .set('Authorization', `Bearer ${outroToken}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toEqual([]);
      });
    });

    describe('resumo do mês', () => {
      let token;
      let categoriaMaterial;
      let categoriaAlimentacao;

      beforeEach(async () => {
        token = await criarUsuarioEToken(`resumo-${Date.now()}@teste.com`);
        const categorias = await obterCategorias(token);
        categoriaMaterial = categorias.find((categoria) => categoria.nome === 'Material');
        categoriaAlimentacao = categorias.find((categoria) => categoria.nome === 'Alimentação');
      });

      test('soma total e quantidade do mês, agrupando por categoria', async () => {
        const comp1 = await criarComprovante(token, { categoriaId: categoriaMaterial.id });
        await request(app)
          .patch(`/api/comprovantes/${comp1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ valor: 100 });

        const comp2 = await criarComprovante(token, { categoriaId: categoriaAlimentacao.id });
        await request(app)
          .patch(`/api/comprovantes/${comp2.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ valor: 50.5 });

        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data.total).toBe(150.5);
        expect(resposta.body.data.quantidade).toBe(2);
        expect(resposta.body.data.porCategoria).toEqual([
          { categoriaId: categoriaMaterial.id, nome: 'Material', total: 100, quantidade: 1 },
          { categoriaId: categoriaAlimentacao.id, nome: 'Alimentação', total: 50.5, quantidade: 1 },
        ]);
      });

      test('valor null conta na quantidade mas não soma no total', async () => {
        await criarComprovante(token, { categoriaId: categoriaMaterial.id });

        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.body.data.total).toBe(0);
        expect(resposta.body.data.quantidade).toBe(1);
      });

      test('comprovante sem data entra pelo mês de cadastro', async () => {
        await criarComprovante(token, { categoriaId: categoriaMaterial.id, valor: 20 });

        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.body.data.quantidade).toBe(1);
        expect(resposta.body.data.total).toBe(20);
      });

      test('comprovante sem data com createdAt na borda do fuso entra no mês de Fortaleza, não no mês UTC', async () => {
        const comprovante = await criarComprovante(token, { categoriaId: categoriaMaterial.id, valor: 20 });

        // 2026-12-01T02:30:00Z é 2026-11-30 23:30 em America/Fortaleza (UTC-3)
        await Comprovante.update(
          { createdAt: new Date('2026-12-01T02:30:00.000Z') },
          { where: { id: comprovante.id }, silent: true }
        );

        const respostaNovembro = await request(app)
          .get('/api/comprovantes/resumo')
          .query({ mes: '2026-11' })
          .set('Authorization', `Bearer ${token}`);

        expect(respostaNovembro.body.data.quantidade).toBe(1);
        expect(respostaNovembro.body.data.total).toBe(20);

        // 2026-11-01T02:30:00Z é 2026-10-31 23:30 em America/Fortaleza (UTC-3)
        await Comprovante.update(
          { createdAt: new Date('2026-11-01T02:30:00.000Z') },
          { where: { id: comprovante.id }, silent: true }
        );

        const respostaOutubro = await request(app)
          .get('/api/comprovantes/resumo')
          .query({ mes: '2026-10' })
          .set('Authorization', `Bearer ${token}`);

        expect(respostaOutubro.body.data.quantidade).toBe(1);
        expect(respostaOutubro.body.data.total).toBe(20);
      });

      test('mês sem comprovantes retorna zeros e porCategoria vazia', async () => {
        await criarComprovante(token, { categoriaId: categoriaMaterial.id, valor: 20 });

        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .query({ mes: '2020-01' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toEqual({
          mes: '2020-01',
          total: 0,
          quantidade: 0,
          porCategoria: [],
        });
      });

      test('sem o parâmetro mes usa o mês atual', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.data.mes).toEqual(expect.stringMatching(/^\d{4}-\d{2}$/));
      });

      test('formato de mes inválido retorna 400', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .query({ mes: '2026/09' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(400);
      });

      test('mês futuro retorna 400', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .query({ mes: '2999-01' })
          .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(400);
      });

      test('resumo exige autenticação', async () => {
        const resposta = await request(app).get('/api/comprovantes/resumo');
        expect(resposta.status).toBe(401);
      });

      test('GET /comprovantes/resumo não cai na rota /comprovantes/:id', async () => {
        const resposta = await request(app)
          .get('/api/comprovantes/resumo')
          .set('Authorization', `Bearer ${token}`);

        // se a rota de :id tratasse "resumo" como id, a resposta seria 404
        // (comprovante não encontrado) em vez do formato do resumo do mês.
        expect(resposta.status).toBe(200);
        expect(resposta.body.data).toHaveProperty('porCategoria');
        expect(resposta.body.data).not.toHaveProperty('estabelecimento');
      });
    });

    describe('limite de observações (500 caracteres)', () => {
      let token;
      let comprovanteId;

      beforeEach(async () => {
        token = await criarUsuarioEToken(`observacoes-limite-${Date.now()}@teste.com`);
        const criado = await criarComprovante(token, {});
        comprovanteId = criado.id;
      });

      test('observações com 501 caracteres no PATCH retorna 400 e não altera o registro', async () => {
        const resposta = await request(app)
          .patch(`/api/comprovantes/${comprovanteId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ observacoes: 'A'.repeat(501) });

        expect(resposta.status).toBe(400);

        const inalterado = await Comprovante.findByPk(comprovanteId);
        expect(inalterado.observacoes).toBeNull();
      });

      test('observações com exatamente 500 caracteres no PATCH é aceito', async () => {
        const resposta = await request(app)
          .patch(`/api/comprovantes/${comprovanteId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ observacoes: 'A'.repeat(500) });

        expect(resposta.status).toBe(200);
        expect(resposta.body.data.observacoes).toHaveLength(500);
      });
    });
  });
});
