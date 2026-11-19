import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import { setTokenProvider } from '../services/api';

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
          SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY)
        ]);
        if (tokenSalvo) setToken(tokenSalvo);
        if (usuarioSalvo) setUsuario(JSON.parse(usuarioSalvo));
      } finally { setCarregando(false); }
    }
    restaurar();
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const resposta = await authService.login({ email, senha });
    const dados = resposta.data?.data || resposta.data;
    if (!dados?.token || !dados?.usuario) {
      throw new Error('Resposta de login inválida.');
    }
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, dados.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(dados.usuario))
    ]);
    setToken(dados.token); setUsuario(dados.usuario);
  }, []);

  const sair = useCallback(async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    setToken(null); setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ token, usuario, carregando, entrar, sair }), [token, usuario, carregando, entrar, sair]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
