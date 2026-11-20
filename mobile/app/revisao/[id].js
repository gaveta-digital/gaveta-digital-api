import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function Revisao() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Revisão provisória</Text>
      {id ? <Text>ID: {id}</Text> : null}
    </View>
  );
}
