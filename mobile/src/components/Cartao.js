import { View } from 'react-native';
import { cores, raios, sombras } from '../theme';

// Cartão branco com borda arredondada e sombra leve (Figma: cartões do Resumo,
// do Detalhe e das listas). `sombra` aceita 'leve', 'item' ou 'destaque'.
export function Cartao({
  children,
  raio = raios.cartaoGrande,
  preenchimento = 22,
  sombra = 'leve',
  estilo,
  ...resto
}) {
  return (
    <View
      {...resto}
      style={[
        {
          backgroundColor: cores.cartao,
          borderRadius: raio,
          padding: preenchimento,
          ...sombras[sombra],
        },
        estilo,
      ]}
    >
      {children}
    </View>
  );
}
