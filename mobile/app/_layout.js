import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { setLogoutHandler } from '../src/services/api';
import { FONTES_PARA_CARREGAR } from '../src/theme/fontes';

function Navigation() {
  const { token, carregando, sair } = useAuth();

  // 401 em rota autenticada: encerra a sessão e volta ao login avisando o usuário.
  useEffect(() => {
    setLogoutHandler(async () => {
      await sair();
      router.replace({ pathname: '/login', params: { sessaoExpirada: '1' } });
    });
  }, [sair]);

  // Sem token vai para o login; com token vai para as abas.
  useEffect(() => {
    if (!carregando) router.replace(token ? '/' : '/login');
  }, [carregando, token]);

  if (carregando) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  // As fontes do protótipo precisam estar carregadas antes de qualquer tela.
  // Se o carregamento falhar, o app abre com as fontes do sistema.
  const [fontesProntas, erroFontes] = useFonts(FONTES_PARA_CARREGAR);
  if (!fontesProntas && !erroFontes) return null;

  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
