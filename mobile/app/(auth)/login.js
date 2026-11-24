import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao } from '../../src/components/Botao';
import { CampoTexto } from '../../src/components/CampoTexto';
import { LogoMarca } from '../../src/components/LogoMarca';
import { Mensagem } from '../../src/components/Mensagem';
import { useAuth } from '../../src/context/AuthContext';
import { cores, raios, sombras } from '../../src/theme';
import { fontes } from '../../src/theme/fontes';
import { mensagemDeErroLogin } from '../../src/utils/erros';
import { validarCamposLogin } from '../../src/utils/validacoes';

export default function Login() {
  const { entrar } = useAuth();
  const { sessaoExpirada, contaCriada } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const senhaRef = useRef(null);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [errosCampos, setErrosCampos] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [erroCredenciais, setErroCredenciais] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function limparErroCampo(campo) {
    setErrosCampos((atual) => {
      if (!atual[campo]) return atual;
      const proximo = { ...atual };
      delete proximo[campo];
      return proximo;
    });
    setErroCredenciais(false);
    setErroGeral('');
  }

  async function enviar() {
    if (carregando) return;

    const validacao = validarCamposLogin({ email, senha });
    if (Object.keys(validacao).length > 0) {
      setErrosCampos(validacao);
      setErroGeral('');
      setErroCredenciais(false);
      return;
    }

    setCarregando(true);
    setErrosCampos({});
    setErroGeral('');
    setErroCredenciais(false);

    try {
      await entrar(email, senha);
    } catch (erroLogin) {
      setErroGeral(mensagemDeErroLogin(erroLogin));
      setErroCredenciais(erroLogin?.response?.status === 401);
    } finally {
      setCarregando(false);
    }
  }

  let banner = null;
  if (erroGeral) {
    banner = { texto: erroGeral, tipo: 'erro' };
  } else if (sessaoExpirada) {
    banner = { texto: 'Sua sessão expirou. Entre novamente.', tipo: 'erro' };
  } else if (contaCriada) {
    banner = { texto: 'Conta criada! Entre com seu e-mail e senha.', tipo: 'sucesso' };
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cores.cartao }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View
          style={{
            backgroundColor: cores.primaria,
            paddingTop: Math.max(48, insets.top + 24),
            paddingBottom: 64,
            paddingHorizontal: 32,
            alignItems: 'center',
          }}
        >
          <LogoMarca tamanho={64} />
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fontes.tituloForte,
              fontSize: 32,
              lineHeight: 48,
              letterSpacing: -0.6,
              color: '#FFFFFF',
              textAlign: 'center',
              marginTop: 18,
              marginBottom: 6,
            }}
          >
            Gaveta Digital
          </Text>
          <Text
            style={{
              fontFamily: fontes.texto,
              fontSize: 15,
              lineHeight: 22.5,
              color: cores.textoSobrePrimaria,
              textAlign: 'center',
            }}
          >
            Seus recibos organizados, sempre
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: cores.cartao,
            marginTop: -24,
            borderTopLeftRadius: raios.cartaoTopo,
            borderTopRightRadius: raios.cartaoTopo,
            paddingHorizontal: 28,
            paddingTop: 36,
            paddingBottom: Math.max(40, insets.bottom + 24),
            ...sombras.cartaoTopo,
          }}
        >
          <Text
            style={{
              fontFamily: fontes.titulo,
              fontSize: 24,
              lineHeight: 36,
              color: cores.primaria,
            }}
          >
            Bem-vindo de volta
          </Text>
          <Text
            style={{
              fontFamily: fontes.texto,
              fontSize: 15,
              lineHeight: 22.5,
              color: cores.textoSecundario,
              marginTop: 6,
              marginBottom: 24,
            }}
          >
            Acesse sua conta para continuar
          </Text>

          {banner ? (
            <Mensagem
              texto={banner.texto}
              tipo={banner.tipo}
              estilo={{ marginTop: 0, marginBottom: 20 }}
            />
          ) : null}

          <CampoTexto
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={(valor) => {
              setEmail(valor);
              limparErroCampo('email');
            }}
            iconeEsquerda="mail-outline"
            erro={errosCampos.email}
            destacarErro={erroCredenciais}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => senhaRef.current?.focus()}
            editable={!carregando}
          />

          <CampoTexto
            ref={senhaRef}
            label="Senha"
            placeholder="••••••••"
            value={senha}
            onChangeText={(valor) => {
              setSenha(valor);
              limparErroCampo('senha');
            }}
            iconeEsquerda="lock-closed-outline"
            iconeDireita={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
            onPressIconeDireita={() => setMostrarSenha((atual) => !atual)}
            labelIconeDireita={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            secureTextEntry={!mostrarSenha}
            erro={errosCampos.senha}
            destacarErro={erroCredenciais}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={enviar}
            editable={!carregando}
            estiloContainer={{ marginBottom: 24 }}
          />

          <Botao
            titulo="Entrar"
            onPress={enviar}
            carregando={carregando}
            estilo={{ marginTop: 0 }}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text
              style={{
                fontFamily: fontes.texto,
                fontSize: 14,
                lineHeight: 21,
                color: cores.textoSecundario,
              }}
            >
              Não tem uma conta?{' '}
            </Text>
            <Link href="/cadastro" replace asChild>
              <Pressable hitSlop={8} accessibilityRole="link">
                <Text
                  style={{
                    fontFamily: fontes.titulo,
                    fontSize: 14,
                    lineHeight: 21,
                    color: cores.primaria,
                  }}
                >
                  Criar Conta
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
