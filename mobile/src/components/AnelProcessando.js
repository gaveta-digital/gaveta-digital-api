import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { cores } from '../theme';

// Formas do círculo do frame "ProcessingScreen" do Figma (viewBox 74 x 74).
const ANEL = 'M71 37C71 55.7777 55.7777 71 37 71C18.2223 71 3 55.7777 3 37C3 18.2223 18.2223 3 37 3C55.7777 3 71 18.2223 71 37Z';
const ARCOS = 'M66.6151 20.2862C69.4067 25.2219 71 30.9249 71 37C71 43.0751 69.4067 48.7781 66.6151 53.7138M53.7138 7.3849C48.7781 4.59333 43.0751 3 37 3C30.9249 3 25.2219 4.59333 20.2862 7.38489M7.3849 20.2862C4.59333 25.2219 3 30.9249 3 37C3 43.0751 4.59333 48.7781 7.38489 53.7138M20.2862 66.6151C25.2219 69.4067 30.9249 71 37 71C43.0751 71 48.7781 69.4067 53.7138 66.6151';

// Anel fixo com os quatro arcos ciano girando: uma volta em 1,1 s e uma pausa de
// 0,9 s, em repetição (a linha do tempo do Figma).
export function AnelProcessando({ tamanho = 80 }) {
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(giro, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    animacao.start();
    return () => animacao.stop();
  }, [giro]);

  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  // O desenho de 74 ocupa 92,5% do quadrado de 80 (o resto é a espessura do traço).
  const lado = tamanho * 0.925;
  const moldura = { position: 'absolute', width: lado, height: lado };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Processando o comprovante"
      style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={lado} height={lado} viewBox="0 0 74 74" style={moldura}>
        <Path d={ANEL} stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth={6} fill="none" />
      </Svg>
      <Animated.View style={[moldura, { transform: [{ rotate: rotacao }] }]}>
        <Svg width={lado} height={lado} viewBox="0 0 74 74">
          <Path d={ARCOS} stroke={cores.destaque} strokeWidth={6} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}
