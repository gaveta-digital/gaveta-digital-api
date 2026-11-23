const UsoIARepository = require('../repositories/UsoIARepository');

const QUANTIDADE_ULTIMAS = 10;

const paraNumero = (valor) => Number(valor) || 0;

const UsoIAService = {
  // Grava uma linha por tentativa de leitura (seção 9 das regras). `comprovanteId`
  // liga o comprovante criado à tentativa que o gerou (a última com sucesso); as
  // demais ficam com null. Nunca lança: falha ao gravar o uso não pode impedir nem
  // desfazer o comprovante, então só vai para o log.
  async registrarTentativas(usuarioId, tentativas, comprovanteId = null) {
    if (!Array.isArray(tentativas) || tentativas.length === 0) {
      return;
    }

    try {
      let indiceDoComprovante = -1;
      if (comprovanteId) {
        indiceDoComprovante = tentativas.map((tentativa) => tentativa.resultado).lastIndexOf('sucesso');
      }

      await UsoIARepository.criarVarios(
        tentativas.map((tentativa, indice) => ({
          usuarioId,
          comprovanteId: indice === indiceDoComprovante ? comprovanteId : null,
          modelo: tentativa.modelo,
          tokensEntrada: tentativa.tokensEntrada,
          tokensSaida: tentativa.tokensSaida,
          tokensTotal: tentativa.tokensTotal,
          duracaoMs: tentativa.duracaoMs,
          resultado: tentativa.resultado,
        }))
      );
    } catch (erro) {
      console.error('[UsoIAService] Não foi possível gravar o uso da IA:', erro.message);
    }
  },

  // Dados do próprio usuário para GET /api/uso-ia.
  async resumo(usuarioId) {
    const [porModelo, ultimas] = await Promise.all([
      UsoIARepository.somarPorModelo(usuarioId),
      UsoIARepository.ultimas(usuarioId, QUANTIDADE_ULTIMAS),
    ]);

    const modelos = porModelo.map((linha) => ({
      modelo: linha.modelo,
      tentativas: paraNumero(linha.tentativas),
      tokensEntrada: paraNumero(linha.tokensEntrada),
      tokensSaida: paraNumero(linha.tokensSaida),
      tokensTotal: paraNumero(linha.tokensTotal),
    }));

    const soma = (campo) => modelos.reduce((total, linha) => total + linha[campo], 0);

    return {
      totalTentativas: soma('tentativas'),
      tokensEntrada: soma('tokensEntrada'),
      tokensSaida: soma('tokensSaida'),
      tokensTotal: soma('tokensTotal'),
      porModelo: modelos,
      ultimas: ultimas.map((registro) => ({
        id: registro.id,
        modelo: registro.modelo,
        resultado: registro.resultado,
        tokensEntrada: registro.tokensEntrada,
        tokensSaida: registro.tokensSaida,
        tokensTotal: registro.tokensTotal,
        duracaoMs: registro.duracaoMs,
        comprovanteId: registro.comprovanteId,
        criadoEm: registro.createdAt,
      })),
    };
  },
};

module.exports = UsoIAService;
