// Mensagens da tabela "Comportamento diante das respostas" (REGRAS-DE-NEGOCIO, seção 8).
export function mensagemDeErro(erro) {
  if (!erro?.response) return 'Sem conexão com o servidor.';

  const { status, data } = erro.response;
  if (status === 422) return 'Não conseguimos ler o comprovante. Tente uma foto mais nítida.';
  if (status === 503) return 'Leitura indisponível no momento. Tente novamente em instantes.';
  if (typeof data?.erro === 'string') return data.erro;
  if (status >= 500) return 'Serviço indisponível no momento. Tente novamente em instantes.';
  return 'Recebemos uma resposta inválida do servidor.';
}
