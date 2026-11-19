import {
  Text,
  View,
} from 'react-native';

export function EstadoVazio({ texto = 'Nenhum item encontrado.' }) {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text>{texto}</Text>
    </View>
  );
}
