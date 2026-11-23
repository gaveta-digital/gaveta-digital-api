import { mensagemDeErro } from './erros';

// Imagem reduzida antes do envio (issue #63): lado maior de ~1280 px, JPEG com
// qualidade 0,7. Menos bytes no envio e menos tokens consumidos pela IA.
export const LADO_MAIOR_PX = 1280;
export const QUALIDADE_JPEG = 0.7;

// Devolve o argumento de resize() para o lado maior ficar em LADO_MAIOR_PX, ou
// null quando a imagem já cabe (nunca amplia). Informar só um lado mantém a
// proporção.
export function calcularRedimensionamento(largura, altura) {
  if (!(largura > 0) || !(altura > 0)) return null;
  if (Math.max(largura, altura) <= LADO_MAIOR_PX) return null;
  return largura >= altura ? { width: LADO_MAIOR_PX } : { height: LADO_MAIOR_PX };
}

// 422 (imagem ilegível) volta para a Captura com a mensagem; qualquer outra
// falha (503, 413, 415, 400, sem conexão...) fica na tela de Processando com a
// opção de tentar de novo. As mensagens vêm da tabela da seção 8 das regras.
export function classificarErroDeEnvio(erro) {
  return {
    tipo: erro?.response?.status === 422 ? 'ilegivel' : 'falha',
    mensagem: mensagemDeErro(erro),
  };
}

// 201 devolve { status, data: comprovante }; sem id não dá para abrir a Revisão
// e a resposta é tratada como fora do formato esperado.
export function idDoComprovanteCriado(resposta) {
  const id = resposta?.data?.data?.id;
  return typeof id === 'string' && id ? id : null;
}
