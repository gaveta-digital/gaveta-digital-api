const iaService = require('../iaService');

const TIMEOUT_TENTATIVA_MS = 15000;
const MENSAGEM_INDISPONIVEL = 'Serviço de leitura indisponível no momento. Tente novamente em instantes.';

// resposta de sucesso do provedor (formato da OpenAI): o JSON da IA vem como texto
// em choices[0].message.content
function respostaIA(objeto, usage = { prompt_tokens: 2000, completion_tokens: 65, total_tokens: 2065 }) {
  const conteudo = typeof objeto === 'string' ? objeto : JSON.stringify(objeto);
  return new Response(
    JSON.stringify({ choices: [{ message: { content: conteudo } }], usage }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

function respostaErro(status, { headers = {}, corpo = { error: { message: 'erro do provedor' } } } = {}) {
  return new Response(JSON.stringify(corpo), { status, headers });
}

function erroTimeout() {
  return Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
}

const DADOS_VAZIOS = {
  estabelecimento: null,
  data: null,
  valor: null,
  categoriaId: null,
};

describe('iaService', () => {
  const categorias = [
    { id: 'cat-1', nome: 'Material' },
    { id: 'cat-2', nome: 'Alimentação' },
  ];
  const imagemBuffer = Buffer.from('conteudo-fake-da-imagem');
  const fetchOriginal = global.fetch;
  let espiaoConsole;

  // lê o corpo JSON enviado numa chamada do fetch simulado
  const corpoDaChamada = (indice = 0) => JSON.parse(global.fetch.mock.calls[indice][1].body);
  const modelosUsados = () => global.fetch.mock.calls.map((_, indice) => corpoDaChamada(indice).model);

  beforeEach(() => {
    global.fetch = jest.fn();
    espiaoConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.IA_API_KEY = 'chave-de-teste';
    delete process.env.IA_BASE_URL;
    delete process.env.IA_MODELOS;
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    espiaoConsole.mockRestore();
    jest.restoreAllMocks();
  });

  test('imagem válida com todos os campos retorna o JSON completo', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA({
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'cat-1',
    }));

    const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

    expect(resultado).toEqual({
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'cat-1',
    });
  });

  test('imagem com campo faltando (ex: data cortada) retorna null nesse campo', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA({
      estabelecimento: 'Mercado Central',
      data: null,
      valor: 42.5,
      categoriaId: 'cat-1',
    }));

    const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

    expect(resultado.data).toBeNull();
    expect(resultado.estabelecimento).toBe('Mercado Central');
  });

  test('campos ausentes na resposta da IA ficam null', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA({ estabelecimento: 'Loja X' }));

    const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

    expect(resultado).toEqual({ ...DADOS_VAZIOS, estabelecimento: 'Loja X' });
  });

  test('categoria não identificada retorna categoriaId null', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA({
      estabelecimento: 'Loja X',
      data: '2026-09-14',
      valor: 10,
      categoriaId: null,
    }));

    const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

    expect(resultado.categoriaId).toBeNull();
    expect(resultado.estabelecimento).toBe('Loja X');
  });

  test('extrai o JSON mesmo quando a IA o envolve em markdown', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA(
      'Aqui está:\n```json\n{"estabelecimento":"Padaria","data":null,"valor":8,"categoriaId":null}\n```'
    ));

    const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

    expect(resultado).toEqual({ ...DADOS_VAZIOS, estabelecimento: 'Padaria', valor: 8 });
  });

  test('imagem ilegível lança erro 422 e não inventa dados', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA({ erro: 'imagem ilegível' }));

    await expect(
      iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida.',
    });
  });

  test('falha simulada de conexão gera erro 503 tratado', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(
      iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503, message: MENSAGEM_INDISPONIVEL });
  });

  test('resposta cujo conteúdo não é JSON gera erro 503', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA('isto não é um json válido'));

    await expect(
      iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  test('resposta sem choices gera erro 503', async () => {
    global.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ usage: {} }), { status: 200 })
    );

    await expect(
      iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  test('corpo da resposta que não é JSON gera erro 503', async () => {
    global.fetch.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 200 }));

    await expect(
      iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  test('conteúdo da IA em formato de lista gera erro 503', async () => {
    global.fetch.mockResolvedValueOnce(respostaIA('[1, 2, 3]'));

    await expect(
      iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  describe('chave da API', () => {
    test('lança 503 sem chamar o provedor se IA_API_KEY não estiver configurada', async () => {
      delete process.env.IA_API_KEY;

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('nunca loga a chave, mesmo se o provedor ou a rede a incluírem no erro', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('falha ao usar a chave chave-de-teste'));
      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      global.fetch.mockResolvedValueOnce(respostaErro(401, {
        corpo: { error: { message: 'Invalid API Key: chave-de-teste' } },
      }));
      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      global.fetch.mockResolvedValueOnce(respostaIA('resposta com chave-de-teste dentro'));
      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      const logsChamados = espiaoConsole.mock.calls.flat().join(' ');
      expect(logsChamados).toContain('***');
      expect(logsChamados).not.toContain('chave-de-teste');
    });

    test('nunca expõe a chave na mensagem de erro devolvida ao cliente', async () => {
      global.fetch.mockResolvedValueOnce(respostaErro(401, {
        corpo: { error: { message: 'Invalid API Key: chave-de-teste' } },
      }));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.not.toMatchObject({
        message: expect.stringContaining('chave-de-teste'),
      });
    });
  });

  describe('requisição enviada ao provedor', () => {
    test('usa o endpoint, o cabeçalho e o corpo do formato OpenAI com os padrões do Groq', async () => {
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      await iaService.analisarComprovante(imagemBuffer, 'image/png', categorias);

      const [url, opcoes] = global.fetch.mock.calls[0];
      expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
      expect(opcoes.method).toBe('POST');
      expect(opcoes.headers.Authorization).toBe('Bearer chave-de-teste');
      expect(opcoes.headers['Content-Type']).toBe('application/json');

      const corpo = corpoDaChamada();
      expect(corpo).toMatchObject({
        model: 'qwen/qwen3.8-27b',
        temperature: 0,
        max_completion_tokens: 600,
        reasoning_effort: 'none',
        response_format: { type: 'json_object' },
      });
      expect(corpo.messages).toHaveLength(1);
      expect(corpo.messages[0].role).toBe('user');
    });

    test('envia o prompt com as categorias e a imagem como data URI em base64', async () => {
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      await iaService.analisarComprovante(imagemBuffer, 'image/png', categorias);

      const [parteTexto, parteImagem] = corpoDaChamada().messages[0].content;

      expect(parteTexto.type).toBe('text');
      expect(parteTexto.text).toContain('cat-1');
      expect(parteTexto.text).toContain('Material');
      expect(parteTexto.text).toContain('cat-2');
      expect(parteTexto.text).toContain('Alimentação');

      expect(parteImagem.type).toBe('image_url');
      expect(parteImagem.image_url.url).toBe(
        `data:image/png;base64,${imagemBuffer.toString('base64')}`
      );
    });

    test('o prompt manda retornar null quando um dígito do valor ou da data não estiver nítido', async () => {
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      const prompt = corpoDaChamada().messages[0].content[0].text;
      expect(prompt).toContain(
        'Se algum dígito do valor ou da data não estiver nítido, retorne null nesse campo em vez de adivinhar.'
      );
    });

    test('escapa aspas no nome da categoria ao montar o prompt', async () => {
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      await iaService.analisarComprovante(
        imagemBuffer,
        'image/jpeg',
        [{ id: 'cat-1', nome: 'Material "elétrico"' }]
      );

      const prompt = corpoDaChamada().messages[0].content[0].text;
      expect(prompt).toContain('nome: "Material \\"elétrico\\""');
    });

    test('avisa no prompt quando não há categorias cadastradas', async () => {
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', []);

      const prompt = corpoDaChamada().messages[0].content[0].text;
      expect(prompt).toContain('nenhuma categoria cadastrada');
      expect(resultado.categoriaId).toBeNull();
    });

    test('IA_BASE_URL personalizada é usada, sem barra repetida no final', async () => {
      process.env.IA_BASE_URL = 'https://outro-provedor.exemplo/v1/';
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(global.fetch.mock.calls[0][0]).toBe('https://outro-provedor.exemplo/v1/chat/completions');
    });

    test('lista vazia em IA_MODELOS volta ao modelo padrão', async () => {
      process.env.IA_MODELOS = ' , ';
      global.fetch.mockResolvedValueOnce(respostaIA(DADOS_VAZIOS));

      await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(modelosUsados()).toEqual(['qwen/qwen3.8-27b']);
    });
  });

  describe('modelos, timeout e limite de requisições', () => {
    const respostaSemDados = () => respostaIA({ ...DADOS_VAZIOS, estabelecimento: 'Loja' });
    let esperas;
    let temporizadoresDeTimeout;

    beforeEach(() => {
      process.env.IA_MODELOS = 'modelo-a, modelo-b ,modelo-c';
      esperas = [];
      temporizadoresDeTimeout = [];

      // as esperas acontecem na hora; o limite de tempo da tentativa é só registrado
      jest.spyOn(global, 'setTimeout').mockImplementation((funcao, ms) => {
        if (ms === TIMEOUT_TENTATIVA_MS) {
          temporizadoresDeTimeout.push(funcao);
        } else {
          esperas.push(ms);
          funcao();
        }
        return 0;
      });
    });

    test('usa o primeiro modelo da lista quando ele responde', async () => {
      global.fetch.mockResolvedValueOnce(respostaSemDados());

      const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(resultado.estabelecimento).toBe('Loja');
      expect(modelosUsados()).toEqual(['modelo-a']);
    });

    test('503 do provedor passa para o próximo modelo, sem espera', async () => {
      global.fetch
        .mockResolvedValueOnce(respostaErro(503))
        .mockResolvedValueOnce(respostaSemDados());

      const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(resultado.estabelecimento).toBe('Loja');
      expect(modelosUsados()).toEqual(['modelo-a', 'modelo-b']);
      expect(esperas).toEqual([]);
    });

    test('se todos os modelos responderem 503, devolve o 503 tratado', async () => {
      global.fetch.mockImplementation(async () => respostaErro(503));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503, message: MENSAGEM_INDISPONIVEL });

      expect(modelosUsados()).toEqual(['modelo-a', 'modelo-b', 'modelo-c']);
    });

    test('timeout passa direto para o próximo modelo, sem espera extra', async () => {
      global.fetch
        .mockRejectedValueOnce(erroTimeout())
        .mockResolvedValueOnce(respostaSemDados());

      const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(resultado.estabelecimento).toBe('Loja');
      expect(modelosUsados()).toEqual(['modelo-a', 'modelo-b']);
      expect(esperas).toEqual([]);
    });

    test('se todos os modelos estourarem o timeout, devolve o 503 tratado', async () => {
      global.fetch.mockImplementation(async () => { throw erroTimeout(); });

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503, message: MENSAGEM_INDISPONIVEL });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    test('cada tentativa tem limite de 15 s e o fetch recebe o sinal que o aborta', async () => {
      global.fetch.mockResolvedValueOnce(respostaSemDados());

      await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(temporizadoresDeTimeout).toHaveLength(1);
      const { signal } = global.fetch.mock.calls[0][1];
      expect(signal.aborted).toBe(false);

      temporizadoresDeTimeout[0]();
      expect(signal.aborted).toBe(true);
    });

    test('429 com retry-after de até 5 s espera e tenta de novo no mesmo modelo', async () => {
      global.fetch
        .mockResolvedValueOnce(respostaErro(429, { headers: { 'retry-after': '2' } }))
        .mockResolvedValueOnce(respostaSemDados());

      const resultado = await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(resultado.estabelecimento).toBe('Loja');
      expect(esperas).toEqual([2000]);
      expect(modelosUsados()).toEqual(['modelo-a', 'modelo-a']);
    });

    test('429 com retry-after de exatamente 5 s ainda espera', async () => {
      global.fetch
        .mockResolvedValueOnce(respostaErro(429, { headers: { 'retry-after': '5' } }))
        .mockResolvedValueOnce(respostaSemDados());

      await iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(esperas).toEqual([5000]);
    });

    test('429 com retry-after acima de 5 s responde 503 na hora, sem esperar nem trocar de modelo', async () => {
      global.fetch.mockResolvedValueOnce(respostaErro(429, { headers: { 'retry-after': '6' } }));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503, message: MENSAGEM_INDISPONIVEL });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(esperas).toEqual([]);
    });

    test('429 sem retry-after responde 503 na hora', async () => {
      global.fetch.mockResolvedValueOnce(respostaErro(429));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(esperas).toEqual([]);
    });

    test('429 com retry-after que não é número responde 503 na hora', async () => {
      global.fetch.mockResolvedValueOnce(
        respostaErro(429, { headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' } })
      );

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('só tenta de novo uma vez: um segundo 429 responde 503', async () => {
      global.fetch.mockImplementation(async () => respostaErro(429, { headers: { 'retry-after': '1' } }));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(esperas).toEqual([1000]);
    });

    test.each([
      [400, 'requisição inválida'],
      [401, 'chave inválida'],
      [404, 'modelo inexistente'],
      [500, 'erro interno do provedor'],
    ])('erro permanente %i (%s) responde 503 sem tentar o próximo modelo', async (status) => {
      global.fetch.mockResolvedValueOnce(respostaErro(status));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503, message: MENSAGEM_INDISPONIVEL });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(esperas).toEqual([]);
    });

    test('imagem ilegível (422) não tenta o próximo modelo', async () => {
      global.fetch.mockResolvedValueOnce(respostaIA({ erro: 'imagem ilegível' }));

      await expect(
        iaService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
