import { Text } from 'react-native';
import { cores } from '../theme';

export function Mensagem({ texto, tipo = 'sucesso' }) {
  const cor = tipo === 'erro' ? cores.erro : cores.sucesso;

  return (
    <Text
      style={{
        color: cor,
        marginVertical: 8,
      }}
    >
      {texto}
    </Text>
  );
}
