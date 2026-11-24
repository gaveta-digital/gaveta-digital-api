import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cores, raios } from '../theme';
import { fontes } from '../theme/fontes';

const TIPOS = {
  erro: {
    fundo: cores.perigoFundo,
    borda: cores.perigoBorda,
    texto: cores.erroTexto,
    icone: 'alert-circle-outline',
  },
  sucesso: {
    fundo: '#E8F5E9',
    borda: '#C8E6C9',
    texto: cores.sucesso,
    icone: 'checkmark-circle-outline',
  },
};

export function Mensagem({ texto, tipo = 'sucesso', estilo }) {
  const visual = TIPOS[tipo] || TIPOS.sucesso;

  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: visual.fundo,
          borderColor: visual.borda,
          borderWidth: 1,
          borderRadius: raios.botaoVoltar,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginVertical: 8,
        },
        estilo,
      ]}
    >
      <Ionicons name={visual.icone} size={16} color={visual.texto} />
      <Text
        style={{
          flex: 1,
          fontFamily: fontes.textoNegrito,
          fontSize: 13.5,
          lineHeight: 20.25,
          color: visual.texto,
        }}
      >
        {texto}
      </Text>
    </View>
  );
}
