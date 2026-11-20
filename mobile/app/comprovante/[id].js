import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function Comprovante() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Comprovante provisório</Text>
      {id ? <Text>ID: {id}</Text> : null}
    </View>
  );
}
