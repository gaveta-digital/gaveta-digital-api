// Fontes do protótipo: DM Sans (títulos e rótulos), Inter (textos) e DM Mono
// (valores em reais). Cada peso é importado do próprio caminho para o app não
// embutir as demais variantes e itálicos da família.
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';

// Nomes para usar em fontFamily nos estilos.
export const fontes = {
  titulo: 'DMSans_700Bold',
  tituloForte: 'DMSans_800ExtraBold',
  subtitulo: 'DMSans_600SemiBold',
  medio: 'DMSans_500Medium',
  texto: 'Inter_400Regular',
  textoMedio: 'Inter_500Medium',
  textoNegrito: 'Inter_600SemiBold',
  textoForte: 'Inter_700Bold',
  numero: 'DMMono_500Medium',
};

// Mapa entregue ao useFonts (expo-font) no layout raiz.
export const FONTES_PARA_CARREGAR = {
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  DMMono_500Medium,
};
