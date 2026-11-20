import {
  Text,
  View,
} from 'react-native';
import { Botao } from './Botao';

export function ErroConexao({ tentarNovamente, mensagem = 'Não foi possível carregar os dados.' }) {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text>{mensagem}</Text>
      <Botao
        titulo="Tentar de novo"
        onPress={tentarNovamente}
      />
    </View>
  );
}
