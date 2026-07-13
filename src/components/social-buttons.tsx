// src/components/social-buttons.tsx
import * as AppleAuthentication from 'expo-apple-authentication';
import { ResponseType } from 'expo-auth-session';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GOOGLE_OAUTH, isGoogleConfigured } from '@/config/oauth';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { loginWithApple, loginWithGoogle } from '@/lib/api';
import Ionicons from '@react-native-vector-icons/ionicons';

interface Props {
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function SocialButtons({ onError, disabled }: Props) {
  const theme = useTheme();
  const { signInWithResponse } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [request, response, promptAsync] = useAuthRequest({
    responseType: ResponseType.IdToken,
    clientId: GOOGLE_OAUTH.webClientId,
    iosClientId: GOOGLE_OAUTH.iosClientId,
    androidClientId: GOOGLE_OAUTH.androidClientId,
  });

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      void handleGoogle(response.authentication.idToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function handleGoogle(idToken: string) {
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle(idToken);
      await signInWithResponse(data);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onGooglePress() {
    if (googleLoading || appleLoading || disabled || !request) return;
    if (!isGoogleConfigured) {
      Alert.alert(
        'Google sign-in not configured',
        'Add your Google OAuth client IDs in src/config/oauth.ts.'
      );
      return;
    }
    await promptAsync();
  }

  async function onApplePress() {
    if (googleLoading || appleLoading || disabled) return;
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      const fullName = credential.fullName;
      const data = await loginWithApple({
        identity_token: credential.identityToken ?? '',
        authorization_code: credential.authorizationCode ?? undefined,
        email: credential.email ?? undefined,
        first_name: fullName?.givenName ?? undefined,
        last_name: fullName?.familyName ?? undefined,
      });
      await signInWithResponse(data);
    } catch (e: unknown) {
      // ERR_CANCELED = user dismissed the Apple sheet — not an error.
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'ERR_CANCELED') {
        return;
      }
      onError?.(e instanceof Error ? e.message : 'Apple sign-in failed.');
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text style={[styles.or, { color: theme.textSecondary }]}>or</Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>

      <View style={styles.row}>
        <SocialButton
          label="Google"
          icon="logo-google"
          loading={googleLoading}
          onPress={onGooglePress}
          disabled={disabled || !request}
          colors={theme}
        />
        {appleAvailable ? (
          <SocialButton
            label="Apple"
            icon="logo-apple"
            loading={appleLoading}
            onPress={onApplePress}
            disabled={disabled}
            colors={theme}
          />
        ) : null}
      </View>
    </View>
  );
}

function SocialButton({
  label,
  icon,
  loading,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  icon: string;
  loading: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled || loading ? 0.6 : pressed ? 0.9 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <View style={styles.btnInner}>
          <Ionicons name={icon as 'logo-google'} size={20} color={colors.text} />
          <Text style={[styles.btnLabel, { color: colors.text }]}>Continue with {label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.four },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  line: { flex: 1, height: 1 },
  or: { fontSize: 13, fontWeight: 600, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  btnLabel: { fontSize: 15, fontWeight: 700 },
});
