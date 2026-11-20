// Aritmética sobre strings "YYYY-MM", sem usar Date, para não depender do
// fuso do aparelho (ver seção 8/REGRAS-DE-NEGOCIO e critério 1 da issue #68).
const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function partesMes(mes) {
  const [ano, mesNumero] = String(mes).split('-').map(Number);
  return { ano, mesNumero };
}

export function formatarMesAno(mes) {
  const { ano, mesNumero } = partesMes(mes);
  return `${NOMES_MES[mesNumero - 1] || ''} ${ano}`;
}

export function mesAnterior(mes) {
  const { ano, mesNumero } = partesMes(mes);
  const anoResultado = mesNumero === 1 ? ano - 1 : ano;
  const mesResultado = mesNumero === 1 ? 12 : mesNumero - 1;
  return `${anoResultado}-${String(mesResultado).padStart(2, '0')}`;
}

export function mesPosterior(mes) {
  const { ano, mesNumero } = partesMes(mes);
  const anoResultado = mesNumero === 12 ? ano + 1 : ano;
  const mesResultado = mesNumero === 12 ? 1 : mesNumero + 1;
  return `${anoResultado}-${String(mesResultado).padStart(2, '0')}`;
}
