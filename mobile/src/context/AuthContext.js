import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import { setTokenProvider } from '../services/api';
import { normalizarEmail, normalizarNome } from '../utils/validacoes';

const AuthContext = createContext(null);
const TOKEN_KEY = 'gaveta_token';
const USER_KEY = 'gaveta_usuario';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setTokenProvider(() => token);
  }, [token]);

  useEffect(() => {
    async function restaurar() {
      try {
        const [tokenSalvo, usuarioSalvo] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY),
        ]);
        if (tokenSalvo && usuarioSalvo) {
          const usuarioParseado = JSON.parse(usuarioSalvo);
          setTokenProvider(() => tokenSalvo);
          setToken(tokenSalvo);
          setUsuario(usuarioParseado);
        }
      } catch {
        // Sessão ilegível ou corrompida: o usuário entra de novo.
        setTokenProvider(() => null);
        await Promise.all([
          SecureStore.deleteItemAsync(TOKEN_KEY),
          SecureStore.deleteItemAsync(USER_KEY),
        ]).catch(() => {});
      } finally { setCarregando(false); }
    }
    restaurar();
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const emailNormalizado = normalizarEmail(email);
    const resposta = await authService.login({ email: emailNormalizado, senha });
    const dados = resposta.data?.data || resposta.data;
    if (!dados?.token || !dados?.usuario) {
      throw new Error('Resposta de login inválida.');
    }
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, dados.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(dados.usuario)),
    ]);
    setTokenProvider(() => dados.token);
    setToken(dados.token);
    setUsuario(dados.usuario);
  }, []);

  const cadastrarEEntrar = useCallback(async ({ nome, email, senha }) => {
    const nomeNormalizado = normalizarNome(nome);
    const emailNormalizado = normalizarEmail(email);

    await authService.cadastrar({
      nome: nomeNormalizado,
      email: emailNormalizado,
      senha,
    });

    try {
      await entrar(emailNormalizado, senha);
    } catch (erroLogin) {
      const erro = new Error(
        'Conta criada, mas não foi possível entrar automaticamente. Faça login para continuar.',
      );
      erro.contaCriada = true;
      erro.causa = erroLogin;
      throw erro;
    }
  }, [entrar]);

  const sair = useCallback(async () => {
    setTokenProvider(() => null);
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    setToken(null); setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ token, usuario, carregando, entrar, cadastrarEEntrar, sair }),
    [token, usuario, carregando, entrar, cadastrarEEntrar, sair],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
