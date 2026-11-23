import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { cores, espacamentos } from '../theme';
import { fontes } from '../theme/fontes';

const ETAPAS = ['Detectando texto', 'Validando campos', 'Categorizando'];
const OPACIDADE_APAGADA = 0.36;
const CICLO_MS = 2400;
const INTERVALO_MS = CICLO_MS / ETAPAS.length;

function Etapa({ texto, posicao }) {
  const opacidade = useRef(new Animated.Value(OPACIDADE_APAGADA)).current;

  useEffect(() => {
    // Cada etapa acende na sua vez; o ciclo total é o mesmo para todas.
    const inicio = posicao * INTERVALO_MS;
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.delay(inicio),
        Animated.timing(opacidade, { toValue: 1, duration: INTERVALO_MS / 2, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: OPACIDADE_APAGADA, duration: INTERVALO_MS / 2, useNativeDriver: true }),
        Animated.delay(CICLO_MS - inicio - INTERVALO_MS),
      ])
    );
    animacao.start();
    return () => animacao.stop();
  }, [opacidade, posicao]);

  return (
    <Animated.Text
      style={{
        opacity: opacidade,
        backgroundColor: cores.superficieSobrePrimaria,
        color: cores.destaque,
        fontFamily: fontes.textoNegrito,
        fontSize: 12.5,
        lineHeight: 18.75,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {texto}
    </Animated.Text>
  );
}

// Etapas "Detectando texto", "Validando campos" e "Categorizando": só visual,
// não refletem o que a API está fazendo de fato.
export function EtapasProcessando() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        maxWidth: 354,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: 12,
        rowGap: espacamentos.sm + 2,
      }}
    >
      {ETAPAS.map((texto, posicao) => (
        <Etapa key={texto} texto={texto} posicao={posicao} />
      ))}
    </View>
  );
}
