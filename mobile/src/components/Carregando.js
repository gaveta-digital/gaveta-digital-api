import {
  ActivityIndicator,
  View,
} from 'react-native';

export function Carregando() {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
