import {
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import { cores, raios, sombras } from '../theme';
import { fontes } from '../theme/fontes';

const VARIANTES = {
  primario: { fundo: cores.primaria, sombra: sombras.botaoPrimario },
  sucesso: { fundo: cores.sucesso, sombra: sombras.botaoSucesso },
};

export function Botao({
  titulo,
  onPress,
  carregando = false,
  disabled = false,
  variante = 'primario',
  estilo,
}) {
  const estaDesabilitado = disabled || carregando;
  const visual = VARIANTES[variante] || VARIANTES.primario;

  return (
    <Pressable
      onPress={onPress}
      disabled={estaDesabilitado}
      accessibilityRole="button"
      accessibilityState={{ disabled: estaDesabilitado, busy: carregando }}
      style={({ pressed }) => [
        {
          backgroundColor: visual.fundo,
          minHeight: 58,
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: raios.pilula,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
          opacity: estaDesabilitado ? 0.6 : pressed ? 0.9 : 1,
          ...visual.sombra,
        },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: fontes.titulo,
            fontSize: 17,
            lineHeight: 25.5,
          }}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}
