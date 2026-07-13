import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { BrandHeader } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)/(home)');
    } catch (err) {
      setError(
        err instanceof ApiError && err.statusCode === 403
          ? 'Your account is pending approval. Please try again later.'
          : err instanceof ApiError
            ? err.message
            : 'Unable to sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BrandHeader tagline="Driver sign in" />

        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          ) : null}

          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={{ marginTop: Spacing.three }}>
            <TextField
              label="Password"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.toggle}>
              <Text style={[styles.toggleText, { color: theme.brand }]}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: Spacing.four }}>
            <Button title="Sign in" loading={loading} onPress={onSubmit} />
          </View>

          {/* <SocialButtons onError={setError} disabled={loading} /> */}

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable style={styles.linkRow}>
              <Text style={[styles.linkText, { color: theme.brand }]}>Forgot password?</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            New driver?
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[styles.linkText, { color: theme.brand }]}> Create an account</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  form: {
    gap: Spacing.two,
  },
  errorBox: {
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  errorText: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 20,
  },
  toggle: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.two,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: 700,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  linkText: {
    fontSize: 14,
    fontWeight: 700,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
});
