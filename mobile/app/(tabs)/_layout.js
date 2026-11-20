import { Tabs } from 'expo-router';
import { cores } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria }}>
      <Tabs.Screen name="index" options={{ title: 'Comprovantes' }} />
      <Tabs.Screen name="categorias" options={{ title: 'Categorias' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
