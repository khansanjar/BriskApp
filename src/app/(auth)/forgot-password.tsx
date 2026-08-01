import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { BrandHeader } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { forgotPassword } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { scale, verticalScale, moderateScale } = useResponsive();
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
    } catch (error) {
      console.error('[Forgot Password Error]:', error);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: scale(Spacing.four),
          justifyContent: 'center',
          gap: verticalScale(Spacing.five),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BrandHeader tagline="Reset your password" />

        {sent ? (
          <View style={{
            gap: verticalScale(Spacing.three),
            padding: scale(Spacing.four),
          }}>
            <Text style={{ fontSize: moderateScale(44), textAlign: 'center' }}>📬</Text>
            <Text style={{ fontSize: moderateScale(22), fontWeight: '800', textAlign: 'center', color: theme.text }}>Check your inbox</Text>
            <Text style={{ fontSize: moderateScale(15), textAlign: 'center', lineHeight: verticalScale(22), color: theme.textSecondary }}>
              If an account exists for {email.trim()}, we've sent a password reset link.
            </Text>
            <Button title="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : (
          <View style={{
            gap: verticalScale(Spacing.three),
            padding: scale(Spacing.four),
          }}>
            {error ? (
              <View style={{ borderRadius: moderateScale(14), padding: verticalScale(Spacing.three), backgroundColor: theme.dangerSoft }}>
                <Text style={{ fontSize: moderateScale(14), fontWeight: '600', lineHeight: verticalScale(20), color: theme.danger }}>{error}</Text>
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
            <View style={{ marginTop: verticalScale(Spacing.four) }}>
              <Button title="Send reset link" loading={loading} onPress={onSubmit} />
            </View>
            <Link href="/forgot-password" asChild>
              <Pressable style={{ alignItems: 'center', paddingVertical: verticalScale(Spacing.three) }}>
                <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: theme.brand }}>← Back to sign in</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
