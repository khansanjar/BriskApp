import { Link, router } from 'expo-router';
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
import { forgotPassword } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
        <BrandHeader tagline="Reset your password" />

        {sent ? (
          <View style={styles.card}>
            <Text style={styles.icon}>📬</Text>
            <Text style={[styles.title, { color: theme.text }]}>Check your inbox</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>
              If an account exists for {email.trim()}, we've sent a password reset link.
            </Text>
            <Button title="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : (
          <View style={styles.card}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
              </View>
            ) : null}
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <View style={{ marginTop: Spacing.four }}>
              <Button title="Send reset link" loading={loading} onPress={onSubmit} />
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
