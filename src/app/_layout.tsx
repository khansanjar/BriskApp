// src/app/_layout.tsx — Root layout (Expo Router entry)
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/auth';
import { Spacing } from '@/constants/theme';
import { ThemeModeProvider, useThemeMode } from '@/theme/theme-context';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function SplashFallback() {
  const { colors } = useThemeMode();
  return (
    <SafeAreaView style={[styles.splash, { backgroundColor: colors.brand }]}>
      <ActivityIndicator color={colors.brandText} size="large" />
      <View style={{ height: Spacing.three }} />
      <Text style={[styles.splashText, { color: colors.brandText }]}>Brisk Transfers</Text>
    </SafeAreaView>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { resolvedScheme } = useThemeMode();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isLoading ? (
        <SplashFallback />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeModeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 20,
    fontWeight: 700,
  },
});
