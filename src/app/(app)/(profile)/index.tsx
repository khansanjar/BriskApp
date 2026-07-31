// src/app/(app)/(profile)/index.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { updateProfile, type User } from '@/lib/api';
import { useThemeMode, type ThemeMode } from '@/theme/theme-context';

const MODES: { key: ThemeMode; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

// Helper function: Update ID ko mask (hide) karne ke liye
function formatUpdateId(id?: string | null, startLen = 5, endLen = 5): string {
  if (!id) return 'N/A';
  // Agar ID ki length threshold se choti ho toh original dikhayein
  if (id.length <= startLen + endLen) return id;

  const firstPart = id.slice(0, startLen);
  const lastPart = id.slice(-endLen);
  const middleMask = '*'.repeat(id.length - startLen - endLen);

  return `${firstPart}${middleMask}${lastPart}`;
}

export default function ProfileScreen() {
  const theme = useTheme();
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
      <View style={styles.header}>
        <View style={[styles.avatarRing, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
          <Avatar
            firstName={user?.user_fname}
            lastName={user?.user_lname}
            photo={user?.profile_photo ?? null}
            size={84}
            fallback="icon"
          />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>
          {user?.user_fname} {user?.user_lname}
        </Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.user_email}</Text>
      </View>

      <Card style={styles.card}>
        {editing ? (
          <>
            <TextField label="First name" value={fname} onChangeText={setFname} />
            <View style={styles.fieldGap}>
              <TextField label="Last name" value={lname} onChangeText={setLname} />
            </View>
            <View style={styles.fieldGap}>
              <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
            <View style={styles.fieldGap}>
              <Button title="Save" loading={saving} onPress={handleSave} />
            </View>
            <Pressable onPress={() => setEditing(false)}>
              <Text style={[styles.cancel, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{user?.userphone}</Text>
            </View>
            <Pressable onPress={() => setEditing(true)} style={styles.editRow}>
              <Ionicons name="create-outline" size={16} color={theme.brand} />
              <Text style={[styles.editLink, { color: theme.brand }]}>Edit profile</Text>
            </Pressable>
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>App Info</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Version</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Update ID</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {/* Pehle 5 aur Aakhri 5 characters dikhayega, center mein ***** */}
            {formatUpdateId(Updates.updateId, 5, 10)}
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.segmentBtn, active && { backgroundColor: theme.brand }]}>
                <Ionicons
                  name={m.icon}
                  size={16}
                  color={active ? theme.brandText : theme.textSecondary}
                />
                <Text
                  style={{
                    color: active ? theme.brandText : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: 13,
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
          styles.logout,
          { borderColor: theme.danger },
          pressed && { backgroundColor: theme.dangerSoft },
        ]}>
        <Ionicons name="log-out-outline" size={20} color={theme.danger} />
        <Text style={[styles.logoutText, { color: theme.danger }]}>Log out</Text>
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

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  avatarRing: {
    padding: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: Spacing.one,
  },
  name: { fontSize: 22, fontWeight: 800 },
  email: { fontSize: 14 },
  card: { marginBottom: Spacing.three },
  fieldGap: { marginTop: Spacing.three },
  error: { marginTop: Spacing.two, fontSize: 13, fontWeight: 600 },
  cancel: { textAlign: 'center', marginTop: Spacing.three, fontWeight: 600 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: 600 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two },
  editLink: { fontWeight: 700 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: Spacing.three },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 16, fontWeight: 700 },
});