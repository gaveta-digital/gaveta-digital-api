const { GoogleGenerativeAI } = require('@google/generative-ai');

const MENSAGEM_INDISPONIVEL = 'Serviço de leitura indisponível no momento. Tente novamente em instantes.';
const MENSAGEM_IMAGEM_ILEGIVEL = 'Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida.';
// Modelos tentados em ordem: cada tentativa (retry) usa o próximo da lista, pois
// a capacidade do Google varia por modelo (503/429 = sobrecarga temporária).
// "gemini-3.5-flash" vai primeiro por ter sido o mais disponível nos testes.
// "gemini-flash-latest" é um alias mantido pelo Google que sempre aponta para o
// flash estável mais recente, o que evita quebrar quando uma versão fixa for
// descontinuada (como ocorreu com "gemini-1.5-flash").
const MODELOS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
];

function criarErro(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function sanitizarParaLog(texto) {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave || typeof texto !== 'string') {
    return texto;
  }
  // A chave nunca pode aparecer em log de erro, mesmo se o SDK a incluir
  // por acidente na mensagem de erro.
  return texto.split(chave).join('***');
}

function montarPrompt(categorias) {
  const listaCategorias = categorias.length > 0
    ? categorias
        .map((categoria) => {
          const nomeEscapado = categoria.nome.replace(/"/g, '\\"');
          return `- id: "${categoria.id}", nome: "${nomeEscapado}"`;
        })
        .join('\n')
    : '(nenhuma categoria cadastrada — retorne null em categoriaId)';

  return `Você é um assistente que extrai dados de comprovantes de despesa (recibos, notas fiscais, cupons fiscais) a partir de uma imagem.

Categorias disponíveis para este usuário (escolha uma delas ou retorne null):
${listaCategorias}

Analise a imagem do comprovante e responda SOMENTE com um JSON válido, sem texto adicional, sem markdown e sem comentários, exatamente neste formato:

{
  "estabelecimento": "string ou null",
  "data": "YYYY-MM-DD ou null",
  "valor": numero_ou_null,
  "categoriaId": "um dos ids listados acima ou null"
}

Regras obrigatórias:
- NUNCA invente ou "alucine" um dado. Se não conseguir identificar um campo com segurança, retorne null nesse campo. É preferível null a um dado errado.
- "categoriaId" deve ser exatamente um dos ids listados acima, ou null se nenhuma categoria da lista se encaixar.
- "data" deve estar no formato YYYY-MM-DD, representar uma data de calendário real e nunca uma data futura. Se não identificar a data, retorne null.
- "valor" deve ser um número (sem símbolo de moeda, sem separador de milhares, com ponto decimal), maior que zero. Se não identificar o valor, retorne null.
- "estabelecimento" deve ser o nome do local. Se não identificar, retorne null.
- Se a imagem estiver tão borrada, escura, cortada ou ilegível que não seja possível interpretar o comprovante, retorne apenas: { "erro": "imagem ilegível" }
- Se o comprovante puder ser interpretado, mas apenas um campo específico não estiver legível, retorne null somente nesse campo — não rejeite a imagem inteira por isso.`;
}

function extrairJson(texto) {
  if (typeof texto !== 'string') {
    return null;
  }

  const correspondencia = texto.match(/\{[\s\S]*\}/);
  return correspondencia ? correspondencia[0] : texto;
}

// Uma tentativa por modelo da lista (1 chamada inicial + 3 novas tentativas).
const ESPERAS_RETRY_MS = [500, 1000, 2000];

function ehErroTransitorio(erro) {
  // 503 (modelo sobrecarregado) e 429 (limite de requisições) costumam passar sozinhos.
  if (erro && (erro.status === 503 || erro.status === 429)) {
    return true;
  }
  return /\[(503|429)\b/.test((erro && erro.message) || '');
}

async function gerarConteudoComRetry(genAI, conteudo) {
  for (let tentativa = 0; ; tentativa += 1) {
    const modelo = MODELOS[tentativa % MODELOS.length];
    try {
      return await genAI.getGenerativeModel({ model: modelo }).generateContent(conteudo);
    } catch (erro) {
      const espera = ESPERAS_RETRY_MS[tentativa];
      if (!ehErroTransitorio(erro) || espera === undefined) {
        throw erro;
      }
      console.error(
        `[geminiService] Gemini indisponível temporariamente (${modelo}, tentativa ${tentativa + 1}); nova tentativa em ${espera}ms.`
      );
      await new Promise((resolver) => setTimeout(resolver, espera));
    }
  }
}

const geminiService = {
  async analisarComprovante(imagemBuffer, mimeType, categorias) {
    if (!process.env.GEMINI_API_KEY) {
      console.error('[geminiService] GEMINI_API_KEY não configurada no processo.');
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    let respostaTexto;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const resultado = await gerarConteudoComRetry(genAI, [
        montarPrompt(categorias),
        {
          inlineData: {
            data: imagemBuffer.toString('base64'),
            mimeType,
          },
        },
      ]);

      respostaTexto = resultado.response.text();
    } catch (erroOriginal) {
      // Erro técnico (timeout, indisponibilidade, limite excedido, etc.) nunca é
      // repassado ao cliente — a chave e detalhes internos não podem vazar.
      console.error('[geminiService] Falha ao chamar o Gemini:', sanitizarParaLog(erroOriginal.message));
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    let dados;
    try {
      dados = JSON.parse(extrairJson(respostaTexto));
    } catch (erroParse) {
      dados = null;
    }

    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      console.error('[geminiService] Resposta do Gemini não é um JSON válido:', respostaTexto);
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    if (dados.erro) {
      throw criarErro(422, MENSAGEM_IMAGEM_ILEGIVEL);
    }

    return {
      estabelecimento: dados.estabelecimento ?? null,
      data: dados.data ?? null,
      valor: dados.valor ?? null,
      categoriaId: dados.categoriaId ?? null,
    };
  },
};

module.exports = geminiService;
