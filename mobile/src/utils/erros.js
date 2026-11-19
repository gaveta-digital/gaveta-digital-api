export function mensagemDeErro(erro) {
  if (!erro?.response) return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
  const mensagem = erro.response.data?.erro;
  if (typeof mensagem === 'string') return mensagem;
  if (erro.response.status >= 500) return 'Serviço indisponível no momento. Tente novamente em instantes.';
  return 'Não foi possível concluir a operação. Confira os dados e tente novamente.';
}
