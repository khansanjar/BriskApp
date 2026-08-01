import { Link, router, useLocalSearchParams } from 'expo-router';
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
import { ApiError, resetPassword } from '@/lib/api';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const { scale, verticalScale, moderateScale } = useResponsive();
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
        contentContainerStyle={{
          flexGrow: 1,
          padding: scale(Spacing.four),
          justifyContent: 'center',
          gap: verticalScale(Spacing.five),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BrandHeader tagline="Choose a new password" />

        {done ? (
          <View style={{
            gap: verticalScale(Spacing.three),
            padding: scale(Spacing.four),
          }}>
            <Text style={{ fontSize: moderateScale(44), textAlign: 'center' }}>🔐</Text>
            <Text style={{ fontSize: moderateScale(22), fontWeight: '800', textAlign: 'center', color: theme.text }}>Password updated</Text>
            <Text style={{ fontSize: moderateScale(15), textAlign: 'center', lineHeight: verticalScale(22), color: theme.textSecondary }}>
              Your password has been reset. Please sign in with your new password.
            </Text>
            <Button title="Sign in" onPress={() => router.replace('/(auth)/login')} />
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
              label="New password"
              placeholder="At least 8 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={{ marginTop: verticalScale(Spacing.three) }}>
              <TextField
                label="Confirm password"
                placeholder="Re-enter password"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>
            <View style={{ marginTop: verticalScale(Spacing.four) }}>
              <Button title="Reset password" loading={loading} onPress={onSubmit} />
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
