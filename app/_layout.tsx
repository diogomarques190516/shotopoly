import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a0a2e' },
          headerTintColor: '#f5c518',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#1a0a2e' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="lobby/[code]" options={{ title: 'Sala de Espera', headerBackVisible: false }} />
        <Stack.Screen name="game/[id]" options={{ title: 'Shotopoly', headerBackVisible: false }} />
      </Stack>
    </>
  );
}
