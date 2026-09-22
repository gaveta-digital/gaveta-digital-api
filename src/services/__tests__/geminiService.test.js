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
});
