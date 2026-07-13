import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { ApiError, resetPassword } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!token) {
      setError('Missing or invalid reset token. Request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to reset password. Please try again.'
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
        <BrandHeader tagline="Choose a new password" />

        {done ? (
          <View style={styles.card}>
            <Text style={styles.icon}>🔐</Text>
            <Text style={[styles.title, { color: theme.text }]}>Password updated</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>
              Your password has been reset. Please sign in with your new password.
            </Text>
            <Button title="Sign in" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : (
          <View style={styles.card}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
              </View>
            ) : null}
            <TextField
              label="New password"
              placeholder="At least 8 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={{ marginTop: Spacing.three }}>
              <TextField
                label="Confirm password"
                placeholder="Re-enter password"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>
            <View style={{ marginTop: Spacing.four }}>
              <Button title="Reset password" loading={loading} onPress={onSubmit} />
            </View>
            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.back}>
                <Text style={[styles.linkText, { color: theme.brand }]}>← Back to sign in</Text>
              </Pressable>
            </Link>
          </View>
        )}
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
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  icon: { fontSize: 44, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: 800, textAlign: 'center' },
  text: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  errorBox: { borderRadius: 14, padding: Spacing.three },
  errorText: { fontSize: 14, fontWeight: 600, lineHeight: 20 },
  back: { alignItems: 'center', paddingVertical: Spacing.three },
  linkText: { fontSize: 14, fontWeight: 700 },
});
