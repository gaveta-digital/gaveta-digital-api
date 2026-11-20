// Participação percentual de uma categoria no total do resumo do mês.
// Total 0 (mês sem gastos) ou negativo nunca divide: retorna 0.
export function calcularPercentual(totalCategoria, totalMes) {
  if (!totalMes || totalMes <= 0) return 0;
  return Math.round((totalCategoria / totalMes) * 100);
}
