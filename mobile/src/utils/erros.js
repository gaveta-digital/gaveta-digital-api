// Mensagens da tabela "Comportamento diante das respostas" (REGRAS-DE-NEGOCIO, seção 8).
export function mensagemDeErro(erro) {
  if (!erro?.response) return 'Sem conexão com o servidor.';

  const { status, data } = erro.response;
  if (status === 409) return 'Você já tem uma categoria com esse nome';
  if (status === 422) return 'Não conseguimos ler o comprovante. Tente uma foto mais nítida.';
  if (status === 503) return 'Leitura indisponível no momento. Tente novamente em instantes.';
  if (typeof data?.erro === 'string') return data.erro;
  if (status >= 500) return 'Serviço indisponível no momento. Tente novamente em instantes.';
  return 'Recebemos uma resposta inválida do servidor.';
}

export function mensagemDeErroLogin(erro) {
  if (!erro?.response) return 'Sem conexão com o servidor.';
  if (erro.response.status === 401) return 'E-mail ou senha incorretos';
  return mensagemDeErro(erro);
}

// A API devolve 400 com a mensagem do primeiro campo inválido. As regras do app
// espelham as da API, então isso não deveria acontecer; se acontecer, a mensagem
// aparece embaixo do campo certo (seção 8), e não só no banner.
function campoDaMensagem(mensagem) {
  if (/e-?mail/i.test(mensagem)) return 'email';
  if (/\bsenha\b/i.test(mensagem)) return 'senha';
  if (/\bnome\b/i.test(mensagem)) return 'nome';
  return null;
}

export function tratarErroCadastro(erro) {
  if (!erro?.response) {
    return { geral: 'Sem conexão com o servidor.', campos: {} };
  }

  if (erro.response.status === 409) {
    return { geral: null, campos: { email: 'E-mail já cadastrado' } };
  }

  const mensagem = mensagemDeErro(erro);
  const campo = erro.response.status === 400 ? campoDaMensagem(mensagem) : null;

  if (campo) {
    return { geral: null, campos: { [campo]: mensagem } };
  }

  return { geral: mensagem, campos: {} };
}
