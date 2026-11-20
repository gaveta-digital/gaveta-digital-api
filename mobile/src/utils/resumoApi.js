// Duplicado de mobile/app/(tabs)/index.js (mensagemErroRequisicao e
// resumoValido) para a tela de Resumo do mês não depender da tela de lista.
// Unificar depois num só lugar — ver relatório da issue #68.
const MENSAGEM_SEM_CONEXAO = 'Sem conexão com o servidor.';
const STATUS_COM_MENSAGEM_PROPRIA = [400, 409, 413, 415];

// Sinaliza resposta com status OK, mas corpo fora do formato esperado — nunca
// tratado como mês sem gastos (seção 8 do documento de regras).
export class RespostaFormatoInvalidoError extends Error {}

export function mensagemErroRequisicao(erro) {
  const resposta = erro?.response;
  if (resposta && STATUS_COM_MENSAGEM_PROPRIA.includes(resposta.status) && resposta.data?.erro) {
    return resposta.data.erro;
  }
  return MENSAGEM_SEM_CONEXAO;
}

export function resumoValido(dados) {
  return Boolean(
    dados
    && typeof dados.mes === 'string'
    && typeof dados.total === 'number'
    && typeof dados.quantidade === 'number'
    && Array.isArray(dados.porCategoria)
  );
}
