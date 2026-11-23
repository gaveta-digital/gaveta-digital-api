// Cor e ícone (Ionicons) de cada categoria, conforme o protótipo.
// corClara é o fundo suave usado nas etiquetas de categoria (ex.: na Lista).
const CATEGORIAS_INICIAIS = {
  alimentacao: { cor: '#2E7D32', corClara: '#E8F5E9', icone: 'restaurant' },
  transporte: { cor: '#1565C0', corClara: '#E3F2FD', icone: 'car' },
  material: { cor: '#E65100', corClara: '#FFF3E0', icone: 'construct' },
  servicos: { cor: '#6A1B9A', corClara: '#F3E5F5', icone: 'briefcase' },
  equipamentos: { cor: '#00838F', corClara: '#E0F7FA', icone: 'hardware-chip' },
  outros: { cor: '#455A64', corClara: '#ECEFF1', icone: 'pricetag' },
};

const ICONE_PADRAO = 'pricetag';

// Cores das categorias criadas pelo usuário, na ordem definida na issue #84.
export const PALETA_CATEGORIAS = [
  { cor: '#AD1457', corClara: '#FCE4EC' },
  { cor: '#00838F', corClara: '#E0F7FA' },
  { cor: '#5D4037', corClara: '#EFEBE9' },
  { cor: '#558B2F', corClara: '#F1F8E9' },
  { cor: '#4527A0', corClara: '#EDE7F6' },
  { cor: '#283593', corClara: '#E8EAF6' },
];

// "Alimentação", " alimentacao " e "ALIMENTAÇÃO" viram a mesma chave.
export function normalizarNomeCategoria(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Hash simples e estável: a mesma categoria cai sempre na mesma cor.
function indiceDaPaleta(chave) {
  let hash = 0;
  for (let i = 0; i < chave.length; i += 1) {
    hash = (hash * 31 + chave.charCodeAt(i)) >>> 0;
  }
  return hash % PALETA_CATEGORIAS.length;
}

// Categorias iniciais têm cor e ícone fixos; as demais usam o ícone padrão e
// uma cor da paleta, escolhida pelo nome normalizado. Nome vazio vale "Outros".
export function estiloDaCategoria(nome) {
  const chave = normalizarNomeCategoria(nome);

  if (!chave) {
    return CATEGORIAS_INICIAIS.outros;
  }

  if (CATEGORIAS_INICIAIS[chave]) {
    return CATEGORIAS_INICIAIS[chave];
  }

  return { ...PALETA_CATEGORIAS[indiceDaPaleta(chave)], icone: ICONE_PADRAO };
}
