import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MolduraCaptura } from '../src/components/MolduraCaptura';
import { cores, espacamentos, raios } from '../src/theme';
import { fontes } from '../src/theme/fontes';
import { prepararImagemParaEnvio } from '../src/utils/imagem';

const FUNDO_CAMERA = '#0D0D0D';
const BRANCO_TRANSLUCIDO = 'rgba(255, 255, 255, 0.15)';

function BotaoRedondo({ onPress, rotulo, desabilitado, ativo, children }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={8}
      style={{
        width: 42,
        height: 42,
        borderRadius: raios.botaoVoltar,
        backgroundColor: ativo ? '#FFFFFF' : BRANCO_TRANSLUCIDO,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

// Permissão da câmera negada: explica o motivo e leva aos ajustes do celular.
// A galeria continua disponível na barra de baixo.
function SemPermissaoDaCamera({ podePedir, onPedir }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="camera-outline" size={48} color="rgba(255, 255, 255, 0.8)" />
      <Text
        accessibilityRole="header"
        style={{ color: '#FFFFFF', fontFamily: fontes.titulo, fontSize: 20, lineHeight: 30, textAlign: 'center', marginTop: 16 }}
      >
        Precisamos da câmera
      </Text>
      <Text
        style={{
          color: 'rgba(255, 255, 255, 0.75)',
          fontFamily: fontes.texto,
          fontSize: 14,
          lineHeight: 21,
          textAlign: 'center',
          marginTop: 8,
          maxWidth: 320,
        }}
      >
        Para fotografar o comprovante, permita o acesso à câmera nos ajustes do celular. Você também pode escolher uma foto da galeria.
      </Text>
      <View style={{ marginTop: 24, gap: 12, alignItems: 'stretch', alignSelf: 'stretch', maxWidth: 320, width: '100%' }}>
        <Pressable
          onPress={() => Linking.openSettings()}
          accessibilityRole="button"
          style={{ backgroundColor: cores.destaque, borderRadius: raios.pilula, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: cores.primaria, fontFamily: fontes.titulo, fontSize: 16, lineHeight: 24 }}>
            Abrir ajustes
          </Text>
        </Pressable>
        {podePedir ? (
          <Pressable
            onPress={onPedir}
            accessibilityRole="button"
            style={{ backgroundColor: BRANCO_TRANSLUCIDO, borderRadius: raios.pilula, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: fontes.titulo, fontSize: 16, lineHeight: 24 }}>
              Permitir câmera
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function Captura() {
  const { erro: erroRecebido } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [flashLigado, setFlashLigado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  // Erro vindo do Processando (422: imagem ilegível) ou da própria captura.
  const [mensagemErro, setMensagemErro] = useState(typeof erroRecebido === 'string' ? erroRecebido : '');

  const cameraLiberada = Boolean(permissao?.granted);

  // Primeira vez: pede a permissão ao abrir a tela.
  useEffect(() => {
    if (permissao && permissao.status === 'undetermined' && permissao.canAskAgain) {
      pedirPermissao();
    }
  }, [permissao, pedirPermissao]);

  // Ao voltar dos ajustes do celular, confere de novo se a câmera foi liberada.
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && permissao && !permissao.granted) pedirPermissao();
    });
    return () => assinatura.remove();
  }, [permissao, pedirPermissao]);

  const seguirParaProcessamento = useCallback(async (imagem) => {
    try {
      const preparada = await prepararImagemParaEnvio(imagem);
      // replace: o Processando ocupa o lugar da Captura na pilha.
      router.replace({ pathname: '/processando', params: { uri: preparada.uri } });
    } catch {
      setMensagemErro('Não foi possível preparar a imagem. Tente outra foto.');
      setOcupado(false);
    }
  }, []);

  const capturar = useCallback(async () => {
    if (ocupado || !cameraRef.current) return;
    setOcupado(true);
    setMensagemErro('');
    try {
      const foto = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      await seguirParaProcessamento(foto);
    } catch {
      setMensagemErro('Não foi possível tirar a foto. Tente de novo.');
      setOcupado(false);
    }
  }, [ocupado, seguirParaProcessamento]);

  const escolherDaGaleria = useCallback(async () => {
    if (ocupado) return;
    setOcupado(true);
    setMensagemErro('');
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (resultado.canceled || !resultado.assets?.length) {
        setOcupado(false);
        return;
      }
      await seguirParaProcessamento(resultado.assets[0]);
    } catch {
      setMensagemErro('Não foi possível abrir a galeria. Confira a permissão do app nos ajustes.');
      setOcupado(false);
    }
  }, [ocupado, seguirParaProcessamento]);

  const fechar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: FUNDO_CAMERA }}>
      <StatusBar style="light" />

      {cameraLiberada ? (
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            // Lanterna acesa já no enquadramento (e na foto), e não só um flash no
            // clique: ajuda a ler o recibo em ambiente escuro.
            enableTorch={flashLigado}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.45)' }]} />
        </>
      ) : null}

      {/* topo: fechar e flash */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: Math.max(espacamentos.cabecalhoTopo, insets.top + espacamentos.sm),
          paddingHorizontal: espacamentos.xxl,
        }}
      >
        <BotaoRedondo onPress={fechar} rotulo="Fechar a câmera">
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </BotaoRedondo>
        {cameraLiberada ? (
          <BotaoRedondo
            onPress={() => setFlashLigado((ligado) => !ligado)}
            rotulo={flashLigado ? 'Desligar a lanterna' : 'Ligar a lanterna'}
            ativo={flashLigado}
          >
            <Ionicons name="flash" size={20} color={flashLigado ? cores.primaria : '#FFFFFF'} />
          </BotaoRedondo>
        ) : (
          <View style={{ width: 42, height: 42 }} />
        )}
      </View>

      {/* meio: moldura (ou o aviso de permissão) */}
      {cameraLiberada ? (
        <MolduraCaptura mensagemErro={mensagemErro} />
      ) : permissao && permissao.status !== 'undetermined' ? (
        <SemPermissaoDaCamera podePedir={permissao.canAskAgain} onPedir={pedirPermissao} />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* base: galeria e disparador */}
      <View
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          paddingTop: espacamentos.xxl,
          paddingBottom: Math.max(40, insets.bottom + espacamentos.lg),
          paddingHorizontal: 32,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 144,
        }}
      >
        <Pressable
          onPress={escolherDaGaleria}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityLabel="Escolher da galeria"
          style={{ position: 'absolute', left: 30, top: 40, alignItems: 'center', gap: 6, width: 76 }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.45)',
              backgroundColor: BRANCO_TRANSLUCIDO,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="images" size={22} color="rgba(255, 255, 255, 0.85)" />
          </View>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontFamily: fontes.textoNegrito, fontSize: 12, lineHeight: 18 }}>
            Galeria
          </Text>
        </Pressable>

        {cameraLiberada ? (
          <Pressable
            onPress={capturar}
            disabled={ocupado}
            accessibilityRole="button"
            accessibilityLabel="Tirar foto"
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FFFFFF',
              borderWidth: 5,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: ocupado ? 0.6 : 1,
            }}
          >
            {ocupado ? (
              <ActivityIndicator color={cores.primaria} />
            ) : (
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: cores.primaria }} />
            )}
          </Pressable>
        ) : (
          <View style={{ width: 80, height: 80 }} />
        )}
      </View>
    </View>
  );
}
