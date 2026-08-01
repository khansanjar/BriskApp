import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View
} from 'react-native';

import { BrandHeader } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const { scale, verticalScale, moderateScale } = useResponsive();
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
        contentContainerStyle={{
          flexGrow: 1,
          padding: scale(Spacing.four),
          justifyContent: 'center',
          gap: verticalScale(Spacing.five),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BrandHeader tagline="Driver sign in" />

        <View style={{ gap: verticalScale(Spacing.two) }}>
          {error ? (
            <View style={{
              borderRadius: moderateScale(14),
              padding: verticalScale(Spacing.three),
              marginBottom: verticalScale(Spacing.two),
              backgroundColor: theme.dangerSoft,
            }}>
              <Text style={{
                fontSize: moderateScale(14),
                fontWeight: '600',
                lineHeight: verticalScale(20),
                color: theme.danger,
              }}>{error}</Text>
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

          <View style={{ marginTop: verticalScale(Spacing.three) }}>
            <TextField
              label="Password"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} style={{
              alignSelf: 'flex-end',
              paddingVertical: verticalScale(Spacing.two),
            }}>
              <Text style={{
                fontSize: moderateScale(13),
                fontWeight: '700',
                color: theme.brand,
              }}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: verticalScale(Spacing.four) }}>
            <Button title="Sign in" loading={loading} onPress={onSubmit} />
          </View>

          {/* <SocialButtons onError={setError} disabled={loading} /> */}

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable style={{
              alignItems: 'center',
              paddingVertical: verticalScale(Spacing.three),
            }}>
              <Text style={{
                fontSize: moderateScale(14),
                fontWeight: '700',
                color: theme.brand,
              }}>Forgot password?</Text>
            </Pressable>
          </Link>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: moderateScale(14),
            color: theme.textSecondary,
          }}>
            New driver?
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={{
                fontSize: moderateScale(14),
                fontWeight: '700',
                color: theme.brand,
              }}> Create an account</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
