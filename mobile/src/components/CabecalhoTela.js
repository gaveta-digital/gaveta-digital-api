import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espacamentos, raios } from '../theme';
import { fontes } from '../theme/fontes';

function voltarPadrao() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function BotaoVoltar({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: raios.botaoVoltar,
        backgroundColor: cores.superficieSobrePrimaria,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
    </Pressable>
  );
}

// Faixa azul-marinho no topo das telas, já com a área segura (relógio e notch).
//
// variante (cada uma segue um frame do Figma):
//   'empilhado' (Resumo do mês): botão de voltar, título abaixo e `children`
//               (ex.: o seletor de mês) na sequência;
//   'linha'     (Detalhe do comprovante): botão de voltar e título lado a lado;
//   'simples'   (Categorias, Lista): sem botão de voltar, com `subtitulo` e
//               `acao` (ex.: "+ Nova categoria") à direita.
export function CabecalhoTela({
  titulo,
  subtitulo,
  variante = 'empilhado',
  onVoltar = voltarPadrao,
  acao,
  children,
}) {
  const insets = useSafeAreaInsets();
  const topo = Math.max(espacamentos.cabecalhoTopo, insets.top + espacamentos.sm);
  const base = {
    backgroundColor: cores.primaria,
    paddingTop: topo,
    paddingHorizontal: espacamentos.xxl,
  };

  if (variante === 'linha') {
    return (
      <View style={{ ...base, paddingBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <BotaoVoltar onPress={onVoltar} />
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontes.titulo, fontSize: 20, lineHeight: 30, color: '#FFFFFF', flexShrink: 1 }}
          >
            {titulo}
          </Text>
        </View>
        {children}
      </View>
    );
  }

  if (variante === 'simples') {
    return (
      <View style={{ ...base, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontes.titulo, fontSize: 24, lineHeight: 36, color: '#FFFFFF' }}
            >
              {titulo}
            </Text>
            {subtitulo ? (
              <Text
                style={{
                  fontFamily: fontes.texto,
                  fontSize: 14,
                  lineHeight: 21,
                  color: cores.textoSobrePrimaria,
                  marginTop: espacamentos.xs,
                }}
              >
                {subtitulo}
              </Text>
            ) : null}
          </View>
          {acao}
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={{ ...base, paddingBottom: 28 }}>
      <BotaoVoltar onPress={onVoltar} />
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fontes.titulo,
          fontSize: 22,
          lineHeight: 33,
          color: '#FFFFFF',
          paddingTop: espacamentos.lg,
        }}
      >
        {titulo}
      </Text>
      {children ? <View style={{ paddingTop: 18 }}>{children}</View> : null}
    </View>
  );
}
