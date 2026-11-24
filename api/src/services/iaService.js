const MENSAGEM_INDISPONIVEL = 'Serviço de leitura indisponível no momento. Tente novamente em instantes.';
const MENSAGEM_IMAGEM_ILEGIVEL = 'Não foi possível ler o comprovante. Tente novamente com uma foto mais nítida.';

// provedor de IA (Groq, no formato da OpenAI); tudo configurável pelo .env
const URL_BASE_PADRAO = 'https://api.groq.com/openai/v1';
// modelos separados por vírgula; se um falhar, tenta o próximo da lista
const MODELOS_PADRAO = 'qwen/qwen3.8-27b';

// tempo máximo de cada tentativa (ms)
const TIMEOUT_TENTATIVA_MS = 15000;
// no 429, só vale esperar se o provedor pedir até este tempo (s)
const ESPERA_MAXIMA_429_S = 5;
// o plano grátis recusa pedidos sem limite de saída; a resposta tem ~65 tokens
const MAX_TOKENS_RESPOSTA = 600;

function lerConfiguracao() {
  const modelos = (process.env.IA_MODELOS || MODELOS_PADRAO)
    .split(',')
    .map((modelo) => modelo.trim())
    .filter(Boolean);

  return {
    baseUrl: (process.env.IA_BASE_URL || URL_BASE_PADRAO).replace(/\/+$/, ''),
    chave: process.env.IA_API_KEY,
    modelos: modelos.length > 0 ? modelos : MODELOS_PADRAO.split(','),
  };
}

function criarErro(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function sanitizarParaLog(texto) {
  const chave = process.env.IA_API_KEY;
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
- Se algum dígito do valor ou da data não estiver nítido, retorne null nesse campo em vez de adivinhar.
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

function ehTimeout(erro) {
  // o AbortController aborta a requisição quando estoura o tempo
  return Boolean(erro) && (erro.name === 'AbortError' || erro.name === 'TimeoutError');
}

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// retry-after em segundos; só devolve a espera (ms) se for curta o bastante
function esperaDoRetryAfter(retryAfter) {
  if (retryAfter === null || retryAfter === undefined || retryAfter === '') {
    return null;
  }

  const segundos = Number(retryAfter);
  if (!Number.isFinite(segundos) || segundos < 0 || segundos > ESPERA_MAXIMA_429_S) {
    return null;
  }

  return Math.ceil(segundos * 1000);
}

// uma chamada a um modelo, com limite de tempo (a leitura do corpo também conta)
async function chamarModelo(configuracao, modelo, prompt, imagemUrl) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_TENTATIVA_MS);

  try {
    const resposta = await fetch(`${configuracao.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${configuracao.chave}`,
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        max_completion_tokens: MAX_TOKENS_RESPOSTA,
        reasoning_effort: 'none',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imagemUrl } },
            ],
          },
        ],
      }),
      signal: controlador.signal,
    });

    return {
      ok: resposta.ok,
      status: resposta.status,
      retryAfter: resposta.headers.get('retry-after'),
      texto: await resposta.text(),
    };
  } finally {
    clearTimeout(temporizador);
  }
}

// Tokens consumidos, como o provedor informa em `usage` (seção 9 das regras).
// Valor ausente ou inválido vale 0.
function lerUso(corpo) {
  const numero = (valor) => (Number.isFinite(valor) && valor >= 0 ? Math.round(valor) : 0);
  const entrada = numero(corpo?.usage?.prompt_tokens);
  const saida = numero(corpo?.usage?.completion_tokens);

  return {
    tokensEntrada: entrada,
    tokensSaida: saida,
    tokensTotal: Number.isFinite(corpo?.usage?.total_tokens)
      ? numero(corpo.usage.total_tokens)
      : entrada + saida,
  };
}

const SEM_TOKENS = { tokensEntrada: 0, tokensSaida: 0, tokensTotal: 0 };

// Registra uma tentativa de leitura no coletor de quem chamou (se houver), para
// o ComprovanteService gravar o UsoIA. Devolve o objeto, que pode ser ajustado
// depois (ex.: de "sucesso" para "ilegivel" quando a IA recusa a imagem).
function registrarTentativa(coletor, modelo, inicio, resultado, uso = SEM_TOKENS) {
  const tentativa = { modelo, ...uso, duracaoMs: Date.now() - inicio, resultado };
  if (Array.isArray(coletor)) {
    coletor.push(tentativa);
  }
  return tentativa;
}

// percorre a lista de modelos e devolve o texto da resposta da IA:
// - timeout ou 503: passa para o próximo modelo
// - 429 com retry-after de até 5 s: espera e tenta de novo (uma vez só)
// - qualquer outro erro, ou lista esgotada: lança, e quem chamou responde 503
// Cada chamada ao provedor, inclusive as que falham, vira uma tentativa no coletor.
// Devolve o conteúdo e a tentativa que o gerou.
async function consultarProvedor(configuracao, prompt, imagemUrl, coletor) {
  let esperouRateLimit = false;

  for (const modelo of configuracao.modelos) {
    let resposta;

    let tentativa;

    for (;;) {
      const inicio = Date.now();

      try {
        resposta = await chamarModelo(configuracao, modelo, prompt, imagemUrl);
      } catch (erro) {
        // sem resposta do provedor (timeout ou falha de rede): tokens 0 e erro
        registrarTentativa(coletor, modelo, inicio, 'erro');
        if (!ehTimeout(erro)) {
          throw erro;
        }
        console.error(
          `[iaService] ${modelo} demorou mais de ${TIMEOUT_TENTATIVA_MS}ms; tentando o próximo modelo.`
        );
        resposta = null;
        break;
      }

      // o provedor respondeu: com erro (429, 503...) não há uso; com 200 o uso vem
      // no corpo e o resultado é provisório até a resposta da IA ser interpretada
      let corpoRecebido = null;
      if (resposta.ok) {
        try {
          corpoRecebido = JSON.parse(resposta.texto);
        } catch (erroParse) {
          corpoRecebido = null;
        }
      }
      tentativa = corpoRecebido
        ? registrarTentativa(coletor, modelo, inicio, 'sucesso', lerUso(corpoRecebido))
        : registrarTentativa(coletor, modelo, inicio, 'erro');

      const espera = resposta.status === 429 && !esperouRateLimit
        ? esperaDoRetryAfter(resposta.retryAfter)
        : null;

      if (espera === null) {
        break;
      }

      esperouRateLimit = true;
      console.error(`[iaService] Limite de requisições (${modelo}); nova tentativa em ${espera}ms.`);
      await esperar(espera);
    }

    if (resposta === null) {
      continue;
    }

    if (resposta.status === 503) {
      console.error(`[iaService] Provedor indisponível (${modelo}); tentando o próximo modelo.`);
      continue;
    }

    if (!resposta.ok) {
      throw new Error(`Provedor respondeu ${resposta.status}: ${String(resposta.texto).slice(0, 300)}`);
    }

    let corpo;
    try {
      corpo = JSON.parse(resposta.texto);
    } catch (erroParse) {
      throw new Error('Resposta do provedor não é um JSON válido.');
    }

    return { conteudo: corpo?.choices?.[0]?.message?.content, tentativa };
  }

  throw new Error('Nenhum modelo da lista respondeu.');
}

const iaService = {
  // manda a imagem + categorias para a IA e recebe os dados do comprovante.
  // opcoes.tentativas: array que recebe uma entrada por chamada ao provedor, com
  // modelo, tokens, duração e resultado (sucesso, ilegivel ou erro). Fica
  // preenchido mesmo quando a leitura falha, para o chamador gravar o uso.
  async analisarComprovante(imagemBuffer, mimeType, categorias, opcoes = {}) {
    const configuracao = lerConfiguracao();

    // sem a chave não dá pra chamar o provedor
    if (!configuracao.chave) {
      console.error('[iaService] IA_API_KEY não configurada no processo.');
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    let respostaTexto;
    let tentativa;
    try {
      ({ conteudo: respostaTexto, tentativa } = await consultarProvedor(
        configuracao,
        montarPrompt(categorias),
        `data:${mimeType};base64,${imagemBuffer.toString('base64')}`,
        opcoes.tentativas
      ));
    } catch (erroOriginal) {
      // o erro real só vai pro log, o cliente recebe uma mensagem genérica
      console.error('[iaService] Falha ao chamar a IA:', sanitizarParaLog(erroOriginal.message));
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    // transforma o texto da resposta em objeto
    let dados;
    try {
      dados = JSON.parse(extrairJson(respostaTexto));
    } catch (erroParse) {
      dados = null;
    }

    // resposta que não é json conta como falha do provedor
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      // o provedor respondeu (e cobrou tokens), mas a resposta não serve
      tentativa.resultado = 'erro';
      console.error('[iaService] Resposta da IA não é um JSON válido:', sanitizarParaLog(respostaTexto));
      throw criarErro(503, MENSAGEM_INDISPONIVEL);
    }

    // a ia avisou que não conseguiu ler a imagem
    if (dados.erro) {
      tentativa.resultado = 'ilegivel';
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

module.exports = iaService;
