// Validação da resposta do resumo e do formato inesperado, compartilhada pela
// lista de comprovantes e pela tela Resumo do mês. As mensagens de erro de
// requisição vêm de mensagemDeErro (src/utils/erros.js), que segue a seção 8.
export const MENSAGEM_FORMATO_INVALIDO = 'Recebemos uma resposta inválida do servidor.';

// Sinaliza resposta com status OK, mas corpo fora do formato esperado — nunca
// tratado como lista ou mês sem gastos (seção 8 do documento de regras).
export class RespostaFormatoInvalidoError extends Error {}

export function resumoValido(dados) {
  return Boolean(
    dados
    && typeof dados.mes === 'string'
    && typeof dados.total === 'number'
    && typeof dados.quantidade === 'number'
    && Array.isArray(dados.porCategoria)
  );
}
