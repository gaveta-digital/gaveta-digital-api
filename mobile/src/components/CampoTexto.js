import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cores, raios } from '../theme';
import { fontes } from '../theme/fontes';

export function CampoTexto({
  label,
  erro,
  destacarErro = false,
  iconeEsquerda,
  iconeDireita,
  onPressIconeDireita,
  labelIconeDireita,
  estiloContainer,
  style,
  ...props
}) {
  const corBorda = erro
    ? cores.perigo
    : destacarErro
      ? cores.erroBordaCampo
      : cores.borda;

  return (
    <View style={[{ marginBottom: 16 }, estiloContainer]}>
      {label ? (
        <Text
          style={{
            fontFamily: fontes.textoForte,
            fontSize: 11,
            lineHeight: 16.5,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: cores.textoSecundario,
            marginBottom: 7,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 52,
          backgroundColor: cores.campoFundo,
          borderWidth: 1,
          borderColor: corBorda,
          borderRadius: raios.campo,
          paddingHorizontal: 16,
        }}
      >
        {iconeEsquerda ? (
          <Ionicons name={iconeEsquerda} size={18} color={cores.textoSecundario} />
        ) : null}
        <TextInput
          placeholderTextColor={cores.textoPlaceholder}
          {...props}
          style={[
            {
              flex: 1,
              paddingVertical: 14,
              fontFamily: fontes.texto,
              fontSize: 15,
              color: cores.textoPrincipal,
            },
            style,
          ]}
        />
        {iconeDireita ? (
          <Pressable
            onPress={onPressIconeDireita}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={labelIconeDireita}
          >
            <Ionicons name={iconeDireita} size={18} color={cores.textoSecundario} />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 5,
            marginTop: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fontes.textoNegrito,
              fontSize: 12.5,
              lineHeight: 18.75,
              color: cores.perigo,
            }}
          >
            •
          </Text>
          <Text
            style={{
              flex: 1,
              fontFamily: fontes.textoNegrito,
              fontSize: 12.5,
              lineHeight: 18.75,
              color: cores.perigo,
            }}
          >
            {erro}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
