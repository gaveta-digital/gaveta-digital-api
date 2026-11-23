// Tema do app. Os valores do protótipo (Figma Gaveta Digital) foram conferidos
// nos frames Resumo do mês, Detalhe do comprovante, Categorias e Lista de
// comprovantes. As chaves antigas (primaria, destaque, sucesso, erro, texto e
// fundo) continuam como estavam, porque as telas atuais ainda as usam.
export const cores = {
  // marca
  primaria: '#1A237E',
  destaque: '#5CD6EB',
  sucesso: '#2E7D32',
  erro: '#B3261E',
  texto: '#202124',
  fundo: '#FFFFFF',

  // protótipo
  fundoTela: '#F5F5F5',
  cartao: '#FFFFFF',
  textoPrincipal: '#212121',
  textoCorpo: '#424242',
  textoSecundario: '#9E9E9E',
  textoFiltro: '#757575',
  borda: '#E0E0E0',
  bordaSuave: '#F0F0F0',
  trilha: '#F0F0F0',
  campoFundo: '#FAFAFA',
  primariaClara: '#E8EAF6',
  // sobre o cabeçalho azul-marinho
  superficieSobrePrimaria: 'rgba(255, 255, 255, 0.12)',
  textoSobrePrimaria: 'rgba(255, 255, 255, 0.65)',
  // ações destrutivas (Excluir)
  perigo: '#D32F2F',
  perigoFundo: '#FFEBEE',
  perigoBorda: '#FFCDD2',
};

export const tamanhosFonte = {
  pequeno: 12,
  normal: 16,
  medio: 20,
  grande: 28,
};

// Raios de borda usados no protótipo.
export const raios = {
  barra: 6,
  chip: 8,
  botaoIcone: 10,
  botaoVoltar: 12,
  campo: 14,
  pilula: 16,
  cartaoItem: 16,
  cartao: 18,
  cartaoGrande: 20,
  filtro: 24,
};

export const espacamentos = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  // faixa azul-marinho no topo das telas
  cabecalhoTopo: 36,
};

// Sombras (iOS usa shadow*, Android usa elevation). O Figma descreve a sombra
// em CSS (blur); no React Native o shadowRadius equivale a cerca de metade.
const sombraBase = { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 } };

export const sombras = {
  leve: { ...sombraBase, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  item: { ...sombraBase, shadowOpacity: 0.06, shadowRadius: 2.5, elevation: 2 },
  destaque: { ...sombraBase, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
};
