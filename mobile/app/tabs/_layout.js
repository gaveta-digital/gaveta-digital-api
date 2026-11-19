import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="comprovantes"
        options={{ title: 'Comprovantes' }}
      />
      <Tabs.Screen
        name="categorias"
        options={{ title: 'Categorias' }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil' }}
      />
    </Tabs>
  );
}
