import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AnelProcessando } from '../src/components/AnelProcessando';
import { EtapasProcessando } from '../src/components/EtapasProcessando';
import { comprovanteService } from '../src/services/comprovanteService';
import { cores, espacamentos, raios } from '../src/theme';
import { fontes } from '../src/theme/fontes';
import { classificarErroDeEnvio, idDoComprovanteCriado } from '../src/utils/envioComprovante';
import { MENSAGEM_FORMATO_INVALIDO } from '../src/utils/resumoApi';

function BotaoDaTela({ titulo, onPress, principal }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        backgroundColor: principal ? cores.destaque : cores.superficieSobrePrimaria,
        borderRadius: raios.pilula,
        paddingVertical: 14,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: principal ? cores.primaria : '#FFFFFF',
          fontFamily: fontes.titulo,
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

export default function Processando() {
  const { uri } = useLocalSearchParams();
  const navigation = useNavigation();
  const [fase, setFase] = useState('enviando');
  const [mensagem, setMensagem] = useState('');
  const iniciouRef = useRef(false);
  // Impede dois envios ao mesmo tempo (ex.: toque duplo em "Tentar de novo" antes
  // de a tela redesenhar), o que criaria dois comprovantes e gastaria duas leituras.
  const enviandoRef = useRef(false);

  const enviar = useCallback(async () => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setFase('enviando');
    setMensagem('');

    try {
      const resposta = await comprovanteService.criar({
        uri,
        fileName: 'comprovante.jpg',
        mimeType: 'image/jpeg',
      });
      const id = idDoComprovanteCriado(resposta);

      if (!id) {
        setMensagem(MENSAGEM_FORMATO_INVALIDO);
        setFase('erro');
        return;
      }

      // 201: o comprovante já existe; a Revisão confirma ou corrige os dados.
      router.replace(`/revisao/${id}`);
    } catch (erro) {
      const { tipo, mensagem: texto } = classificarErroDeEnvio(erro);

      // 422: imagem ilegível volta para a Captura, que mostra o aviso vermelho.
      if (tipo === 'ilegivel') {
        router.replace({ pathname: '/captura', params: { erro: texto } });
        return;
      }

      setMensagem(texto);
      setFase('erro');
    } finally {
      enviandoRef.current = false;
    }
  }, [uri]);

  // Envia uma única vez ao abrir. Sem imagem não há o que enviar.
  useEffect(() => {
    if (!uri) {
      router.replace('/captura');
      return;
    }
    if (iniciouRef.current) return;
    iniciouRef.current = true;
    enviar();
  }, [uri, enviar]);

  // Enquanto envia, o voltar fica bloqueado: o servidor pode já estar criando o
  // comprovante, então sair agora deixaria um registro que o usuário não viu.
  // Com erro, o voltar funciona e leva à Captura.
  const enviando = fase === 'enviando';
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !enviando });
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      if (enviando) return true;
      router.replace('/captura');
      return true;
    });
    return () => assinatura.remove();
  }, [enviando, navigation]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cores.primaria,
        alignItems: 'center',
        justifyContent: 'center',
        padding: espacamentos.xxl,
      }}
    >
      <StatusBar style="light" />

      {enviando ? (
        <>
          <View style={{ paddingBottom: espacamentos.xxl }}>
            <AnelProcessando />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              color: '#FFFFFF',
              fontFamily: fontes.tituloForte,
              fontSize: 24,
              lineHeight: 36,
              textAlign: 'center',
              paddingBottom: espacamentos.sm,
            }}
          >
            IA Processando…
          </Text>
          <Text
            style={{
              color: cores.textoSobrePrimaria,
              fontFamily: fontes.texto,
              fontSize: 15,
              lineHeight: 22.5,
              textAlign: 'center',
              paddingBottom: 28,
            }}
          >
            Extraindo dados do comprovante
          </Text>
          <EtapasProcessando />
        </>
      ) : (
        <View style={{ alignSelf: 'stretch', maxWidth: 354, width: '100%', alignItems: 'center' }}>
          <Text
            accessibilityRole="header"
            style={{
              color: '#FFFFFF',
              fontFamily: fontes.tituloForte,
              fontSize: 24,
              lineHeight: 36,
              textAlign: 'center',
              paddingBottom: espacamentos.sm,
            }}
          >
            Não foi possível enviar
          </Text>
          <Text
            accessibilityRole="alert"
            style={{
              color: cores.textoSobrePrimaria,
              fontFamily: fontes.texto,
              fontSize: 15,
              lineHeight: 22.5,
              textAlign: 'center',
              paddingBottom: 28,
            }}
          >
            {mensagem}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: espacamentos.md }}>
            <BotaoDaTela titulo="Tentar de novo" onPress={enviar} principal />
            <BotaoDaTela titulo="Voltar para a câmera" onPress={() => router.replace('/captura')} />
          </View>
        </View>
      )}
    </View>
  );
}
