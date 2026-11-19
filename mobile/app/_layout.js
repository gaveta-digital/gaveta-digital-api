import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { setLogoutHandler } from '../src/services/api';

function Navigation() {
  const { token, carregando, sair } = useAuth();

  useEffect(() => {
    setLogoutHandler(async () => {
      await sair();
      router.replace('/auth/login');
    });
  }, [sair]);

  useEffect(() => {
    if (!carregando) router.replace(token ? '/tabs' : '/auth/login');
  }, [carregando, token]);

  if (carregando) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
