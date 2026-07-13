// src/app/(app)/(home)/index.tsx
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { BookingCard } from '@/components/booking-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/section-header';
import { Spacing } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { getDashboard, type Booking, type DashboardData, type HistoryBooking, type User } from '@/lib/api';
import { getUser } from '@/lib/storage';
import { useTheme } from '@/hooks/use-theme';

const PENDING_COLOR = '#22c55e';
const NEXTDAY_COLOR = '#3b82f6';

function dateKey(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const todayKey = localKey(0);
const tomorrowKey = localKey(1);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getDashboard();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
    }
  }, []);

  useEffect(() => {
    load();
    getUser<User>().then(setUser);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openBooking = (id: number) => router.push(`/(app)/(home)/booking/${id}`);

  const upcoming = data?.upcoming_bookings ?? [];
  const todayRides = upcoming.filter((b) => dateKey(b.pickup_date) === todayKey);
  const nextDayRides = upcoming.filter((b) => dateKey(b.pickup_date) === tomorrowKey);
  const history = (data?.recent_history ?? []).slice(0, 10);

  return (
    <Screen
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
        ),
      }}>
      <View style={styles.greeting}>
        <Text style={[styles.greetingText, { color: theme.textSecondary }]}>
          {greeting()},
        </Text>
        <Text style={[styles.greetingName, { color: theme.text }]}>
          {user?.user_fname ?? 'Driver'}
        </Text>
      </View>

      <View style={styles.counts}>
        <View style={styles.countItem}>
          <View style={[styles.countCircle, { backgroundColor: PENDING_COLOR }]}>
            <Text style={styles.countNumber}>{todayRides.length}</Text>
          </View>
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>Pending rides</Text>
        </View>
        <View style={styles.countItem}>
          <View style={[styles.countCircle, { backgroundColor: NEXTDAY_COLOR }]}>
            <Text style={styles.countNumber}>{nextDayRides.length}</Text>
          </View>
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>Next day rides</Text>
        </View>
      </View>

      <SectionHeader title="Today's pending rides" />

      {error && data == null ? (
        <EmptyState icon="⚠️" title="Something went wrong" description={error} />
      ) : !data ? (
        <ActivityIndicator color={theme.brand} style={{ padding: Spacing.three }} />
      ) : todayRides.length === 0 ? (
        <EmptyState icon="🚗" title="No rides today" description="No pending rides scheduled for today." />
      ) : (
        todayRides.map((item: Booking) => (
          <BookingCard key={item.booking_id} booking={item} onPress={() => openBooking(item.booking_id)} />
        ))
      )}

      <SectionHeader title="Next day's rides" />

      {data && nextDayRides.length === 0 ? (
        <EmptyState icon="📆" title="Nothing yet" description="Upcoming rides for tomorrow will appear here." />
      ) : (
        data &&
        nextDayRides.map((item: Booking) => (
          <BookingCard key={item.booking_id} booking={item} onPress={() => openBooking(item.booking_id)} />
        ))
      )}

      <SectionHeader title="Recent rides" />

      {data && history.length === 0 ? (
        <EmptyState icon="🕘" title="No history" description="Your completed rides will show up here." />
      ) : (
        data &&
        history.map((item: HistoryBooking) => (
          <Pressable
            key={item.booking_id}
            onPress={() => openBooking(item.booking_id)}
            style={({ pressed }) => (pressed ? styles.pressed : null)}>
            <Card>
              <View style={styles.historyRow}>
                <View style={styles.historyRoute}>
                  <Text style={[styles.historyLocation, { color: theme.text }]} numberOfLines={1}>
                    {item.pickup_location}
                  </Text>
                  <Text style={[styles.historyLocation, { color: theme.text }]} numberOfLines={1}>
                    {item.dropoff_location}
                  </Text>
                </View>
                <Text style={[styles.historyFare, { color: theme.text }]}>
                  {formatCurrency(item.total_fare)}
                </Text>
              </View>
              <Text style={[styles.historyMeta, { color: theme.textSecondary }]}>
                {item.pickup_date} · Completed
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { marginBottom: Spacing.three },
  greetingText: { fontSize: 15 },
  greetingName: { fontSize: 26, fontWeight: 800, marginTop: 2 },
  counts: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  countItem: { flex: 1, alignItems: 'center' },
  countCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countNumber: { color: '#ffffff', fontSize: 32, fontWeight: 800 },
  countLabel: { fontSize: 13, fontWeight: 600, marginTop: 8 },
  pressed: { opacity: 0.92 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  historyRoute: { flex: 1, gap: 4 },
  historyLocation: { fontSize: 15, fontWeight: 600 },
  historyFare: { fontSize: 16, fontWeight: 800 },
  historyMeta: { fontSize: 12, marginTop: 6 },
});
