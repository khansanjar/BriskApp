// src/app/(app)/(profile)/index.tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const MODES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

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
    // Partial update — only send the fields the driver actually changed.
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
        <Avatar
          firstName={user?.user_fname}
          lastName={user?.user_lname}
          photo={user?.profile_photo ?? null}
          size={72}
        />
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
            <Pressable onPress={() => setEditing(true)}>
              <Text style={[styles.editLink, { color: theme.brand }]}>Edit profile</Text>
            </Pressable>
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[
                  styles.modePill,
                  {
                    backgroundColor: active ? theme.brand : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <Text style={{ color: active ? theme.brandText : theme.text, fontWeight: '700' }}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button title="Log out" variant="destructive" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
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
  editLink: { marginTop: Spacing.two, fontWeight: 700 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: Spacing.three },
  modeRow: { flexDirection: 'row', gap: Spacing.two },
  modePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
});
