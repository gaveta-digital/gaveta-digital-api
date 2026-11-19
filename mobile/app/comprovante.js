import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function Comprovante() {
  const { comprovanteId } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Comprovante provisório</Text>
      {comprovanteId ? <Text>ID: {comprovanteId}</Text> : null}
    </View>
  );
}
