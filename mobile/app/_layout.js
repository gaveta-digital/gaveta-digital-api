import { Stack, router, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { setLogoutHandler } from '../src/services/api';
import { FONTES_PARA_CARREGAR } from '../src/theme/fontes';

function Navigation() {
  const { token, carregando, sair } = useAuth();
  const segments = useSegments();
  const expirandoRef = useRef(false);
  const naAreaAuth = segments[0] === '(auth)';

  // 401 em rota autenticada: encerra a sessão uma única vez e avisa no login.
  useEffect(() => {
    setLogoutHandler(async () => {
      if (expirandoRef.current) return;
      expirandoRef.current = true;
      await sair();
    });
  }, [sair]);

  // Sem token vai para o login (fora de (auth)); com token sai de (auth) para as abas.
  useEffect(() => {
    if (carregando) return;

    if (token && naAreaAuth) {
      expirandoRef.current = false;
      router.replace('/');
    } else if (!token && !naAreaAuth) {
      if (expirandoRef.current) {
        expirandoRef.current = false;
        router.replace({ pathname: '/login', params: { sessaoExpirada: '1' } });
      } else {
        router.replace('/login');
      }
    }
  }, [carregando, token, naAreaAuth]);

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
