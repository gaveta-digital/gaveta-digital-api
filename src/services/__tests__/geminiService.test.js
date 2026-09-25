const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiService = require('../geminiService');

function respostaGemini(objeto) {
  return {
    response: {
      text: () => JSON.stringify(objeto),
    },
  };
}

describe('geminiService', () => {
  const categorias = [
    { id: 'cat-1', nome: 'Material' },
    { id: 'cat-2', nome: 'Alimentação' },
  ];
  const imagemBuffer = Buffer.from('conteudo-fake-da-imagem');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'chave-de-teste';
  });

  test('imagem válida com todos os campos retorna o JSON completo', async () => {
    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'cat-1',
    }));

    const resultado = await geminiService.analisarComprovante(
      imagemBuffer,
      'image/jpeg',
      categorias
    );

    expect(resultado).toEqual({
      estabelecimento: 'Mercado Central',
      data: '2026-09-14',
      valor: 42.5,
      categoriaId: 'cat-1',
    });
  });

  test('imagem com campo faltando (ex: data cortada) retorna null nesse campo', async () => {
    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: 'Mercado Central',
      data: null,
      valor: 42.5,
      categoriaId: 'cat-1',
    }));

    const resultado = await geminiService.analisarComprovante(
      imagemBuffer,
      'image/jpeg',
      categorias
    );

    expect(resultado.data).toBeNull();
    expect(resultado.estabelecimento).toBe('Mercado Central');
  });

  test('categoria não identificada retorna categoriaId null', async () => {
    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: 'Loja X',
      data: '2026-09-14',
      valor: 10,
      categoriaId: null,
    }));

    const resultado = await geminiService.analisarComprovante(
      imagemBuffer,
      'image/jpeg',
      categorias
    );

    expect(resultado.categoriaId).toBeNull();
  });

  test('imagem ilegível lança erro 422 e não inventa dados', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      respostaGemini({ erro: 'imagem ilegível' })
    );

    await expect(
      geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida.',
    });
  });

  test('falha simulada de conexão (timeout/indisponibilidade) gera erro 503 tratado', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('timeout de conexão'));

    await expect(
      geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({
      statusCode: 503,
      message: 'Serviço de leitura indisponível no momento. Tente novamente em instantes.',
    });
  });

  test('nunca loga a chave da API no console, mesmo se o SDK a incluir no erro', async () => {
    const espiaoConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContent.mockRejectedValueOnce(
      new Error('Unauthorized: chave-de-teste inválida')
    );

    await expect(
      geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });

    const logsChamados = espiaoConsole.mock.calls.flat().join(' ');
    expect(logsChamados).not.toContain('chave-de-teste');

    espiaoConsole.mockRestore();
  });

  test('resposta que não pode ser interpretada como JSON gera erro 503', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'isto não é um json válido' },
    });

    await expect(
      geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  test('lança 503 sem chamar o Gemini se GEMINI_API_KEY não estiver configurada', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(
      geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.toMatchObject({ statusCode: 503 });

    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('nunca expõe a chave da API na mensagem de erro', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('Unauthorized: chave-de-teste inválida')
    );

    await expect(
      geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
    ).rejects.not.toMatchObject({
      message: expect.stringContaining('chave-de-teste'),
    });
  });

  test('envia o prompt com as categorias e a imagem em base64 para o Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: null,
    }));

    await geminiService.analisarComprovante(imagemBuffer, 'image/png', categorias);

    const [conteudoEnviado] = mockGenerateContent.mock.calls[0];
    const [prompt, partesImagem] = conteudoEnviado;

    expect(prompt).toContain('cat-1');
    expect(prompt).toContain('Material');
    expect(prompt).toContain('cat-2');
    expect(prompt).toContain('Alimentação');
    expect(partesImagem.inlineData.mimeType).toBe('image/png');
    expect(partesImagem.inlineData.data).toBe(imagemBuffer.toString('base64'));
  });

  test('escapa aspas no nome da categoria ao montar o prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: null,
    }));

    const categoriasComAspas = [{ id: 'cat-1', nome: 'Material "elétrico"' }];

    await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categoriasComAspas);

    const [prompt] = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('nome: "Material \\"elétrico\\""');
  });

  test('avisa no prompt quando não há categorias cadastradas', async () => {
    mockGenerateContent.mockResolvedValueOnce(respostaGemini({
      estabelecimento: null,
      data: null,
      valor: null,
      categoriaId: null,
    }));

    const resultado = await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', []);

    const [prompt] = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain('nenhuma categoria cadastrada');
    expect(resultado.categoriaId).toBeNull();
  });

  describe('retry em falhas transitórias do Gemini', () => {
    const respostaVazia = respostaGemini({
      estabelecimento: 'Loja',
      data: null,
      valor: null,
      categoriaId: null,
    });
    const erroSobrecarga = () => Object.assign(
      new Error('[503 Service Unavailable] This model is currently experiencing high demand.'),
      { status: 503 }
    );
    let espiaoTimeout;
    let espiaoConsole;

    beforeEach(() => {
      // faz a espera do retry acontecer na hora
      espiaoTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return 0;
      });
      espiaoConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      espiaoTimeout.mockRestore();
      espiaoConsole.mockRestore();
    });

    test('tenta de novo após 503 e retorna o resultado quando a segunda tentativa funciona', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(erroSobrecarga())
        .mockResolvedValueOnce(respostaVazia);

      const resultado = await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(resultado.estabelecimento).toBe('Loja');
    });

    test('também tenta de novo após 429 (limite de requisições)', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(Object.assign(new Error('[429 Too Many Requests]'), { status: 429 }))
        .mockResolvedValueOnce(respostaVazia);

      await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('reconhece o 503 pela mensagem quando o erro não traz status', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('[GoogleGenerativeAI Error]: [503 Service Unavailable] high demand'))
        .mockResolvedValueOnce(respostaVazia);

      await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('desiste após 4 tentativas no total (uma por modelo) e devolve o erro 503 tratado', async () => {
      mockGenerateContent.mockRejectedValue(erroSobrecarga());

      await expect(
        geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({
        statusCode: 503,
        message: 'Serviço de leitura indisponível no momento. Tente novamente em instantes.',
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
      mockGenerateContent.mockReset();
    });

    test('usa gemini-3.5-flash primeiro e alterna para os demais quando está sobrecarregado', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(erroSobrecarga())
        .mockRejectedValueOnce(erroSobrecarga())
        .mockRejectedValueOnce(erroSobrecarga())
        .mockResolvedValueOnce(respostaVazia);

      await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      const { getGenerativeModel } = GoogleGenerativeAI.mock.results[0].value;
      const modelosUsados = getGenerativeModel.mock.calls.map(([opcoes]) => opcoes.model);
      expect(modelosUsados).toEqual([
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-3.6-flash',
        'gemini-3.1-flash-lite',
      ]);
    });

    test('limita cada tentativa a 15s (timeout enviado ao SDK)', async () => {
      mockGenerateContent.mockResolvedValueOnce(respostaVazia);

      await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      const { getGenerativeModel } = GoogleGenerativeAI.mock.results[0].value;
      expect(getGenerativeModel.mock.calls[0][1]).toEqual({ timeout: 15000 });
    });

    test('timeout passa direto para o próximo modelo, sem espera extra', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(
          new Error('[GoogleGenerativeAI Error]: Request aborted when fetching https://x: This operation was aborted')
        )
        .mockResolvedValueOnce(respostaVazia);

      const resultado = await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      expect(resultado.estabelecimento).toBe('Loja');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(espiaoTimeout).not.toHaveBeenCalled();

      const { getGenerativeModel } = GoogleGenerativeAI.mock.results[0].value;
      const modelosUsados = getGenerativeModel.mock.calls.map(([opcoes]) => opcoes.model);
      expect(modelosUsados).toEqual(['gemini-3.5-flash', 'gemini-flash-latest']);
    });

    test('se todos os modelos estourarem o timeout, devolve o 503 tratado', async () => {
      mockGenerateContent.mockRejectedValue(
        new Error('[GoogleGenerativeAI Error]: Request aborted when fetching https://x: aborted')
      );

      await expect(
        geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
      mockGenerateContent.mockReset();
    });

    test('espera entre as tentativas (0,5s, 1s e 2s)', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(erroSobrecarga())
        .mockRejectedValueOnce(erroSobrecarga())
        .mockRejectedValueOnce(erroSobrecarga())
        .mockResolvedValueOnce(respostaVazia);

      await geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias);

      const esperas = espiaoTimeout.mock.calls.map(([, ms]) => ms);
      expect(esperas).toEqual([500, 1000, 2000]);
    });

    test('não tenta de novo em erros permanentes (ex: modelo inexistente, 404)', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        Object.assign(new Error('[404 Not Found] model not found'), { status: 404 })
      );

      await expect(
        geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 503 });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(espiaoTimeout).not.toHaveBeenCalled();
    });

    test('não tenta de novo quando a imagem é ilegível (422)', async () => {
      mockGenerateContent.mockResolvedValueOnce(respostaGemini({ erro: 'imagem ilegível' }));

      await expect(
        geminiService.analisarComprovante(imagemBuffer, 'image/jpeg', categorias)
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
