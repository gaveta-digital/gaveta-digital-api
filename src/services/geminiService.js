const { GoogleGenerativeAI } = require('@google/generative-ai');

const MENSAGEM_INDISPONIVEL = 'Serviço de leitura indisponível no momento. Tente novamente em instantes.';
const MENSAGEM_IMAGEM_ILEGIVEL = 'Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida.';
// modelos do gemini, se um falhar tenta o próximo da lista
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
  // tira a chave do texto pra ela nunca aparecer no log
  return texto.split(chave).join('***');
}

// monta o texto que vai pra ia, com a lista de categorias do usuário
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

// espera entre as tentativas (ms)
const ESPERAS_RETRY_MS = [500, 1000, 2000];

// tempo máximo de cada tentativa (ms)
const TIMEOUT_TENTATIVA_MS = 15000;

function ehTimeout(erro) {
  // o sdk aborta a requisição quando estoura o tempo
  return /Request aborted/i.test((erro && erro.message) || '');
}

function ehErroTransitorio(erro) {
  // 503 e 429 = google sobrecarregado, vale tentar de novo
  if (erro && (erro.status === 503 || erro.status === 429)) {
    return true;
  }
  return ehTimeout(erro) || /\[(503|429)\b/.test((erro && erro.message) || '');
}

// faz a chamada no gemini, se der 503, 429 ou timeout tenta o próximo modelo
async function gerarConteudoComRetry(genAI, conteudo) {
  for (let tentativa = 0; ; tentativa += 1) {
    const modelo = MODELOS[tentativa % MODELOS.length];
    try {
      const modeloGemini = genAI.getGenerativeModel(
        { model: modelo },
        { timeout: TIMEOUT_TENTATIVA_MS }
      );
      return await modeloGemini.generateContent(conteudo);
    } catch (erro) {
      const espera = ESPERAS_RETRY_MS[tentativa];
      if (!ehErroTransitorio(erro) || espera === undefined) {
        throw erro;
      }
      if (ehTimeout(erro)) {
        // estourou o tempo, passa pro próximo modelo sem esperar
        console.error(
          `[geminiService] ${modelo} demorou mais de ${TIMEOUT_TENTATIVA_MS}ms (tentativa ${tentativa + 1}); tentando o próximo modelo.`
        );
        continue;
      }
      console.error(
        `[geminiService] Gemini indisponível temporariamente (${modelo}, tentativa ${tentativa + 1}); nova tentativa em ${espera}ms.`
      );
      await new Promise((resolver) => setTimeout(resolver, espera));
    }
  }
}

const geminiService = {
  // aqui entra o gemini: manda a imagem + categorias e recebe os dados do comprovante
  async analisarComprovante(imagemBuffer, mimeType, categorias) {
    // sem a chave não dá pra chamar o gemini
    if (!process.env.GEMINI_API_KEY) {
      console.error('[geminiService] GEMINI_API_KEY não configurada no processo.');
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    let respostaTexto;
    try {
      // cria o cliente do gemini com a chave do .env
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
      // o erro real só vai pro log, o cliente recebe uma mensagem genérica
      console.error('[geminiService] Falha ao chamar o Gemini:', sanitizarParaLog(erroOriginal.message));
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    // transforma o texto da resposta em objeto
    let dados;
    try {
      dados = JSON.parse(extrairJson(respostaTexto));
    } catch (erroParse) {
      dados = null;
    }

    // resposta que não é json conta como falha do gemini
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      console.error('[geminiService] Resposta do Gemini não é um JSON válido:', respostaTexto);
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    // a ia avisou que não conseguiu ler a imagem
    if (dados.erro) {
      throw criarErro(422, MENSAGEM_IMAGEM_ILEGIVEL);
    }

    // o que a ia não achou fica null
    return {
      estabelecimento: dados.estabelecimento ?? null,
      data: dados.data ?? null,
      valor: dados.valor ?? null,
      categoriaId: dados.categoriaId ?? null,
    };
  },
};

module.exports = geminiService;
