import {
  Text,
  View,
} from 'react-native';
import { Botao } from './Botao';

export function ErroConexao({ tentarNovamente }) {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text>Não foi possível carregar os dados.</Text>
      <Botao
        titulo="Tentar de novo"
        onPress={tentarNovamente}
      />
    </View>
  );
}
