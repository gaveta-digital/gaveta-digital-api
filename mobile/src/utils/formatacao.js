export function formatarMoeda(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 'R$ 0,00';
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatarData(valor) {
  if (!valor) {
    return '';
  }

  const texto = String(valor).slice(0, 10);
  const partes = texto.split('-');

  if (partes.length !== 3) {
    return '';
  }

  const [ano, mes, dia] = partes;
  const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);

  if (
    Number.isNaN(data.getTime())
    || data.getFullYear() !== Number(ano)
    || data.getMonth() + 1 !== Number(mes)
    || data.getDate() !== Number(dia)
  ) {
    return '';
  }

  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
}

export function valorDigitadoParaNumero(valor) {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    return null;
  }

  const texto = String(valor).trim();

  if (!texto) {
    return null;
  }

  const normalizado = texto
    .replace(/\./g, '')
    .replace(',', '.');
  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : null;
}

export function iniciaisNome(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return partes
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}
