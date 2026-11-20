import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Botao } from '../../src/components/Botao';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Mensagem } from '../../src/components/Mensagem';
import { useAuth } from '../../src/context/AuthContext';
import { mensagemDeErro } from '../../src/utils/erros';

export default function Login() {
  const { entrar } = useAuth();
  const { sessaoExpirada } = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setCarregando(true);
    setErro('');

    try {
      await entrar(email, senha);
      router.replace('/');
    } catch (erroLogin) {
      setErro(mensagemDeErro(erroLogin));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 24 }}>
        Gaveta Digital
      </Text>
      <CampoTexto
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <CampoTexto
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />
      {sessaoExpirada && !erro ? (
        <Mensagem texto="Sua sessão expirou. Entre novamente." tipo="erro" />
      ) : null}
      {erro ? <Mensagem texto={erro} tipo="erro" /> : null}
      <Botao titulo="Entrar" onPress={enviar} carregando={carregando} />
      <Link
        href="/cadastro"
        style={{ marginTop: 20, textAlign: 'center' }}
      >
        Ainda não tenho cadastro
      </Link>
    </View>
  );
}
