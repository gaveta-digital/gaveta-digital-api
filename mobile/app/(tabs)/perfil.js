import { Text, View } from 'react-native';
import { Botao } from '../../src/components/Botao';
import { useAuth } from '../../src/context/AuthContext';

export default function Perfil() {
  const { usuario, sair } = useAuth();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text>{usuario?.nome || 'Perfil'}</Text>
      <Botao titulo="Sair" onPress={sair} />
    </View>
  );
}
