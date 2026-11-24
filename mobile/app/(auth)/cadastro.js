import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao } from '../../src/components/Botao';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Mensagem } from '../../src/components/Mensagem';
import { useAuth } from '../../src/context/AuthContext';
import { cores, raios, sombras } from '../../src/theme';
import { fontes } from '../../src/theme/fontes';
import { tratarErroCadastro } from '../../src/utils/erros';
import { validarCamposCadastro } from '../../src/utils/validacoes';

export default function Cadastro() {
  const { cadastrarEEntrar } = useAuth();
  const insets = useSafeAreaInsets();
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmarSenhaRef = useRef(null);

  const [dados, setDados] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });
  const [errosCampos, setErrosCampos] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  const alterar = (campo) => (valor) => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErrosCampos((atual) => {
      if (!atual[campo] && !(campo === 'senha' && atual.confirmarSenha)) {
        return atual;
      }
      const proximo = { ...atual };
      delete proximo[campo];
      if (campo === 'senha') {
        delete proximo.confirmarSenha;
      }
      return proximo;
    });
    setErroGeral('');
  };

  async function enviar() {
    if (carregando) return;

    const validacao = validarCamposCadastro(dados);
    if (Object.keys(validacao).length > 0) {
      setErrosCampos(validacao);
      setErroGeral('');
      return;
    }

    setCarregando(true);
    setErroGeral('');
    setErrosCampos({});

    try {
      await cadastrarEEntrar({
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
      });
    } catch (erroCadastro) {
      if (erroCadastro?.contaCriada) {
        router.replace({ pathname: '/login', params: { contaCriada: '1' } });
        return;
      }

      const { geral, campos } = tratarErroCadastro(erroCadastro);
      setErroGeral(geral || '');
      setErrosCampos(campos);
    } finally {
      setCarregando(false);
    }
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
            paddingTop: Math.max(44, insets.top + 20),
            paddingBottom: 56,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fontes.tituloForte,
              fontSize: 28,
              lineHeight: 42,
              color: '#FFFFFF',
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            Criar Conta
          </Text>
          <Text
            style={{
              fontFamily: fontes.texto,
              fontSize: 14,
              lineHeight: 21,
              color: cores.textoSobrePrimaria,
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Comece a organizar seus comprovantes hoje
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
            paddingTop: 32,
            paddingBottom: Math.max(40, insets.bottom + 24),
            ...sombras.cartaoTopo,
          }}
        >
          <Text
            style={{
              fontFamily: fontes.titulo,
              fontSize: 18,
              lineHeight: 27,
              color: cores.primaria,
              marginBottom: 20,
            }}
          >
            Seus dados
          </Text>

          {erroGeral ? (
            <Mensagem
              texto={erroGeral}
              tipo="erro"
              estilo={{ marginTop: 0, marginBottom: 16 }}
            />
          ) : null}

          <CampoTexto
            label="Nome completo"
            placeholder="Seu nome completo"
            value={dados.nome}
            onChangeText={alterar('nome')}
            erro={errosCampos.nome}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!carregando}
          />

          <CampoTexto
            ref={emailRef}
            label="E-mail"
            placeholder="seu@email.com"
            value={dados.email}
            onChangeText={alterar('email')}
            erro={errosCampos.email}
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
            value={dados.senha}
            onChangeText={alterar('senha')}
            erro={errosCampos.senha}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmarSenhaRef.current?.focus()}
            editable={!carregando}
          />

          <CampoTexto
            ref={confirmarSenhaRef}
            label="Confirmar senha"
            placeholder="••••••••"
            value={dados.confirmarSenha}
            onChangeText={alterar('confirmarSenha')}
            erro={errosCampos.confirmarSenha}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={enviar}
            editable={!carregando}
            estiloContainer={{ marginBottom: 24 }}
          />

          <Botao
            titulo="Criar conta"
            variante="sucesso"
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
              Já possui cadastro?{' '}
            </Text>
            <Link href="/login" replace asChild>
              <Pressable hitSlop={8} accessibilityRole="link">
                <Text
                  style={{
                    fontFamily: fontes.titulo,
                    fontSize: 14,
                    lineHeight: 21,
                    color: cores.primaria,
                  }}
                >
                  Já tenho conta
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
