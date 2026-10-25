import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.accent,
          background: colors.background,
          card: colors.background,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: colors.accent }}>
        <Stack.Screen name="index" options={{ title: 'Wingman' }} />
        <Stack.Screen name="me" options={{ title: 'About me' }} />
        <Stack.Screen name="match/new" options={{ title: 'New match', presentation: 'modal' }} />
        <Stack.Screen name="match/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="match/[id]/pocket" options={{ title: 'Pocket card' }} />
      </Stack>
    </ThemeProvider>
  );
}
