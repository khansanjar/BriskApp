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
// import { SocialButtons } from '@/components/social-buttons';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, register } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const theme = useTheme();
  const [form, setForm] = useState({
    user_fname: '',
    user_lname: '',
    user_email: '',
    userphone: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.user_fname.trim()) next.user_fname = 'Required';
    if (!form.user_lname.trim()) next.user_lname = 'Required';
    if (!form.user_email.trim()) next.user_email = 'Required';
    else if (!EMAIL_RE.test(form.user_email)) next.user_email = 'Enter a valid email';
    if (!form.userphone.trim()) next.userphone = 'Required';
    if (!form.password) next.password = 'Required';
    else if (form.password.length < 8) next.password = 'At least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setServerError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={[styles.successTitle, { color: theme.text }]}>You're on the list!</Text>
          <Text style={[styles.successText, { color: theme.textSecondary }]}>
            Your account is pending admin approval. We'll notify you by email as soon as you're
            approved.
          </Text>
          <Button title="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BrandHeader tagline="Create your driver account" />

        {serverError ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{serverError}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.half}>
            <TextField
              label="First name"
              placeholder="John"
              value={form.user_fname}
              onChangeText={(v) => update('user_fname', v)}
              error={errors.user_fname}
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Last name"
              placeholder="Smith"

              value={form.user_lname}
              onChangeText={(v) => update('user_lname', v)}
              error={errors.user_lname}
            />
          </View>
        </View>

        <TextField
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.user_email}
          onChangeText={(v) => update('user_email', v)}
          error={errors.user_email}
        />
        <View style={{ marginTop: Spacing.three }}>
          <TextField
            label="Phone"
            placeholder="+34 600 000 000"
            keyboardType="phone-pad"
            value={form.userphone}
            onChangeText={(v) => update('userphone', v)}
            error={errors.userphone}
          />
        </View>
        <View style={{ marginTop: Spacing.three }}>
          <TextField
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={form.password}
            onChangeText={(v) => update('password', v)}
            error={errors.password}
          />
        </View>

        <View style={{ marginTop: Spacing.four }}>
          <Button title="Create account" loading={loading} onPress={onSubmit} />
        </View>

        {/* <SocialButtons onError={setServerError} disabled={loading} /> */}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Already registered?
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.linkText, { color: theme.brand }]}> Sign in</Text>
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
    gap: Spacing.three,
    paddingTop: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  half: { flex: 1 },
  errorBox: {
    borderRadius: 14,
    padding: Spacing.three,
  },
  errorText: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  footerText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: 700 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  successCard: {
    maxWidth: 420,
    gap: Spacing.three,
    alignItems: 'center',
    padding: Spacing.four,
  },
  successIcon: { fontSize: 48 },
  successTitle: { fontSize: 22, fontWeight: 800 },
  successText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
