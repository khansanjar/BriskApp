// src/app/(app)/(profile)/index.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { updateProfile, type User } from '@/lib/api';
import { useThemeMode, type ThemeMode } from '@/theme/theme-context';

const MODES: { key: ThemeMode; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

// Helper function: Update ID ko 12-character format mein mask karne ke liye (4 Start + 4 Stars + 4 End)
function formatUpdateId(id?: string | null): string {
  if (!id) return 'N/A';
  if (id.length < 8) return id;

  const firstPart = id.slice(0, 4);
  const lastPart = id.slice(-4);

  return `${firstPart}****${lastPart}`;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
  const { mode, setMode } = useThemeMode();
  const { user, signOut, updateLocalUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [fname, setFname] = useState(user?.user_fname ?? '');
  const [lname, setLname] = useState(user?.user_lname ?? '');
  const [phone, setPhone] = useState(user?.userphone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    const payload: Partial<Pick<User, 'user_fname' | 'user_lname' | 'userphone'>> = {};
    if (fname !== user.user_fname) payload.user_fname = fname;
    if (lname !== user.user_lname) payload.user_lname = lname;
    if (phone !== user.userphone) payload.userphone = phone;

    try {
      if (Object.keys(payload).length > 0) {
        const { user: updated } = await updateProfile(payload);
        await updateLocalUser(updated);
      }
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={{
        width: '100%',
        alignItems: isLandscape ? 'flex-start' : 'center',
        gap: verticalScale(Spacing.two),
        marginBottom: verticalScale(Spacing.three),
        flexDirection: isLandscape ? 'row' : 'column',
      }}>
        <View style={{
          padding: scale(Spacing.half),
          borderRadius: moderateScale(999),
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.brandSoft,
        }}>
          <Avatar
            firstName={user?.user_fname}
            lastName={user?.user_lname}
            photo={user?.profile_photo ?? null}
            size={moderateScale(isLandscape ? 56 : 84)}
            fallback="icon"
          />
        </View>
        <View style={{ flex: 1, alignItems: isLandscape ? 'flex-start' : 'center', minWidth: 0 }}>
          <Text style={{ fontSize: moderateScale(22), fontWeight: '800', color: theme.text, flexShrink: 1 }} numberOfLines={2}>
            {user?.user_fname} {user?.user_lname}
          </Text>
          <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary, flexShrink: 1 }} numberOfLines={1}>{user?.user_email}</Text>
        </View>
      </View>

      <Card style={{ width: '100%', marginBottom: verticalScale(Spacing.three) }}>
        {editing ? (
          <>
            <TextField label="First name" value={fname} onChangeText={setFname} />
            <View style={{ marginTop: verticalScale(Spacing.three) }}>
              <TextField label="Last name" value={lname} onChangeText={setLname} />
            </View>
            <View style={{ marginTop: verticalScale(Spacing.three) }}>
              <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            {error ? <Text style={{ marginTop: verticalScale(Spacing.two), fontSize: moderateScale(13), fontWeight: '600', color: theme.danger }}>{error}</Text> : null}
            <View style={{ marginTop: verticalScale(Spacing.three) }}>
              <Button title="Save" loading={saving} onPress={handleSave} />
            </View>
            <Pressable onPress={() => setEditing(false)}>
              <Text style={{ textAlign: 'center', marginTop: verticalScale(Spacing.three), fontWeight: '600', color: theme.textSecondary }}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: isLandscape ? 'center' : undefined,
              paddingVertical: verticalScale(Spacing.two),
            }}>
              <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary, flexShrink: 1 }}>Phone</Text>
              <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, flexShrink: 1 }} numberOfLines={1}>{user?.userphone}</Text>
            </View>
            <Pressable onPress={() => setEditing(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(Spacing.two) }}>
              <Ionicons name="create-outline" size={scale(16)} color={theme.brand} />
              <Text style={{ fontWeight: '700', color: theme.brand }}>Edit profile</Text>
            </Pressable>
          </>
        )}
      </Card>

      <Card style={{ width: '100%', marginBottom: verticalScale(Spacing.three) }}>
        <Pressable
          onPress={() => router.push('/(app)/(profile)/earnings')}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: verticalScale(Spacing.two),
            },
            pressed && { opacity: 0.7 },
          ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.three) }}>
            <View style={{
              width: scale(36),
              height: scale(36),
              borderRadius: moderateScale(10),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.brandSoft,
            }}>
              <Ionicons name="cash-outline" size={scale(20)} color={theme.brand} />
            </View>
            <View>
              <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: theme.text }}>
                Earnings & Reports
              </Text>
              
            </View>
          </View>
        </Pressable>
      </Card>

      <Card style={{ width: '100%', marginBottom: verticalScale(Spacing.three) }}>
        <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>App Info</Text>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: isLandscape ? 'center' : undefined,
          paddingVertical: verticalScale(Spacing.two),
        }}>
          <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary, flexShrink: 1 }}>Version</Text>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, flexShrink: 1 }} numberOfLines={1}>
            {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: isLandscape ? 'center' : undefined,
          paddingVertical: verticalScale(Spacing.two),
        }}>
          <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary, flexShrink: 1 }}>Update ID</Text>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, flexShrink: 1 }} numberOfLines={1}>
            {formatUpdateId(Updates.updateId)}
          </Text>
        </View>
      </Card>

      <Card style={{ width: '100%', marginBottom: verticalScale(Spacing.three) }}>
        <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>Appearance</Text>
        <View style={{
          flexDirection: 'row',
          borderRadius: moderateScale(14),
          padding: scale(Spacing.half),
          gap: scale(Spacing.half),
          backgroundColor: theme.backgroundElement,
        }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  paddingVertical: verticalScale(Spacing.two),
                  borderRadius: moderateScale(10),
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: scale(6),
                  backgroundColor: active ? theme.brand : undefined,
                }}>
                <Ionicons
                  name={m.icon}
                  size={scale(16)}
                  color={active ? theme.brandText : theme.textSecondary}
                />
                <Text
                  style={{
                    color: active ? theme.brandText : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: moderateScale(13),
                  }}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Pressable
        onPress={() => confirmLogout(signOut)}
        style={({ pressed }) => [
          {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scale(Spacing.two),
            paddingVertical: verticalScale(Spacing.three),
            borderRadius: moderateScale(14),
            borderWidth: scale(1.5),
            borderColor: theme.danger,
            marginBottom: verticalScale(Spacing.three),
          },
          pressed && { backgroundColor: theme.dangerSoft },
        ]}>
        <Ionicons name="log-out-outline" size={scale(20)} color={theme.danger} />
        <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: theme.danger }}>Log out</Text>
      </Pressable>
    </Screen>
  );
}

function confirmLogout(onConfirm: () => void) {
  Alert.alert(
    'Log out',
    'Are you sure you want to log out?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onConfirm },
    ]
  );
}