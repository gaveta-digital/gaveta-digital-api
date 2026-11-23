import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estiloDaCategoria } from '../theme/categorias';

// Tamanho do ícone dentro do círculo nos dois tamanhos do protótipo
// (Categorias: círculo de 38; Lista: círculo de 52).
const TAMANHO_DO_ICONE = { 38: 18, 52: 23 };

// Círculo com a cor da categoria e o ícone dela em branco.
export function IconeCategoria({ nome, tamanho = 38, estilo }) {
  const { cor, icone } = estiloDaCategoria(nome);
  const tamanhoDoIcone = TAMANHO_DO_ICONE[tamanho] ?? Math.round(tamanho * 0.45);

  return (
    <View
      accessible={false}
      style={[
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: cor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        estilo,
      ]}
    >
      <Ionicons name={icone} size={tamanhoDoIcone} color="#FFFFFF" />
    </View>
  );
}
