import { useState } from 'react';
import { Text, View } from 'react-native';
import { cores, espacamentos } from '../theme';
import { fontes } from '../theme/fontes';

// Moldura tracejada da Captura (frame "Tela 3 – Câmera"): proporção 3:4, com o
// aviso da IA acima, a instrução abaixo e, quando há erro, o aviso vermelho.
// O conjunto fica centralizado entre a barra do topo e a de baixo.
export function MolduraCaptura({ mensagemErro }) {
  // Mede a própria área (e não a janela), assim a moldura acompanha o espaço
  // real da tela. Antes da primeira medida, nada é desenhado.
  const [larguraDaArea, setLarguraDaArea] = useState(0);
  const largura = Math.min(Math.round(larguraDaArea * 0.634), 420);
  const altura = Math.round((largura * 4) / 3);

  return (
    <View
      pointerEvents="none"
      onLayout={(evento) => setLarguraDaArea(evento.nativeEvent.layout.width)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacamentos.xxl }}
    >
      {larguraDaArea > 0 ? (
        <View
          style={{
            width: largura,
            height: altura,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: 'rgba(92, 214, 235, 0.8)',
            borderRadius: 20,
          }}
        >
          <View style={{ position: 'absolute', top: -40, left: 0, right: 0, alignItems: 'center' }}>
            <Text
              style={{
                backgroundColor: 'rgba(26, 35, 126, 0.88)',
                color: cores.destaque,
                fontFamily: fontes.textoNegrito,
                fontSize: 12.5,
                lineHeight: 18.75,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              ✦ IA extração automática ativa
            </Text>
          </View>
          <Text
            style={{
              position: 'absolute',
              top: altura + 12,
              left: -40,
              right: -40,
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: fontes.texto,
              fontSize: 13.5,
              lineHeight: 20.25,
            }}
          >
            Posicione o recibo dentro da moldura
          </Text>
        </View>
      ) : null}

      {mensagemErro ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{
            marginTop: 52,
            maxWidth: 360,
            backgroundColor: cores.perigo,
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 14,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 5,
            elevation: 8,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontFamily: fontes.textoNegrito,
              fontSize: 14,
              lineHeight: 21,
              textAlign: 'center',
            }}
          >
            {mensagemErro}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
