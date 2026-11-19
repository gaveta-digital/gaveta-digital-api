import {
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import { cores } from '../theme';

export function Botao({
  titulo,
  onPress,
  carregando = false,
  disabled = false,
}) {
  const estaDesabilitado = disabled || carregando;

  return (
    <Pressable
      onPress={onPress}
      disabled={estaDesabilitado}
      style={{
        backgroundColor: cores.primaria,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
        opacity: estaDesabilitado ? 0.6 : 1,
      }}
    >
      {carregando ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}
