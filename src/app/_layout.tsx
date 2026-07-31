// src/app/_layout.tsx — Root layout (Expo Router entry)
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { ThemeModeProvider, useThemeMode } from '@/theme/theme-context';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function SplashFallback() {
  const { colors } = useThemeMode();
  return (
    <SafeAreaView style={[styles.splash, { backgroundColor: colors.brand }]}>
      <View style={styles.logoContainer}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={{ height: Spacing.three }} />
      <ActivityIndicator color={colors.brandText} size="large" />
    </SafeAreaView>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { resolvedScheme } = useThemeMode();
  const [updateCheckDone, setUpdateCheckDone] = useState(false);
  const didStartCheck = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || didStartCheck.current) return;
    didStartCheck.current = true;
    let cancelled = false;
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (!cancelled && update.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (!cancelled) {
            await Updates.reloadAsync();
          }
        }
      } catch (error) {
        console.error('Error fetching latest Expo update:', error);
      } finally {
        if (!cancelled) {
          setUpdateCheckDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  const showSplash = isLoading || !updateCheckDone;

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {showSplash ? (
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
  logoContainer: {
    borderRadius: 20,
    overflow: 'hidden'
  },
  logo: {
    maxWidth: 120,
    maxHeight: 120,
    width: '30%',
    height: '30%',
  },
});
