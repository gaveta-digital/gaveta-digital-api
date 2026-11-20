import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Botao } from '../../src/components/Botao';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Mensagem } from '../../src/components/Mensagem';
import { authService } from '../../src/services/authService';
import { mensagemDeErro } from '../../src/utils/erros';
import { validarCadastro } from '../../src/utils/validacoes';

export default function Cadastro() {
  const [dados, setDados] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    const validacao = validarCadastro(dados);
    if (validacao) {
      setErro(validacao);
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      await authService.cadastrar(dados);
      router.replace('/login');
    } catch (erroCadastro) {
      setErro(mensagemDeErro(erroCadastro));
    } finally {
      setCarregando(false);
    }
  }

  const alterar = (campo) => (valor) => setDados((atual) => ({ ...atual, [campo]: valor }));

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 24 }}>
        Criar conta
      </Text>
      <CampoTexto
        label="Nome"
        value={dados.nome}
        onChangeText={alterar('nome')}
      />
      <CampoTexto
        label="E-mail"
        value={dados.email}
        onChangeText={alterar('email')}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <CampoTexto
        label="Senha"
        value={dados.senha}
        onChangeText={alterar('senha')}
        secureTextEntry
      />
      {erro ? <Mensagem texto={erro} tipo="erro" /> : null}
      <Botao
        titulo="Cadastrar"
        onPress={enviar}
        carregando={carregando}
      />
    </View>
  );
}
