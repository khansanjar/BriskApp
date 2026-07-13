// src/app/(app)/(home)/index.tsx
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Avatar } from '@/components/ui/avatar';
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
      {/* Greeting + avatar in a single horizontal row */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingCopy}>
          <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{greeting()}</Text>
          <Text style={[styles.greetingName, { color: theme.text }]} numberOfLines={1}>
            Welcome, {user?.user_fname ?? 'Driver'} 👋
          </Text>
        </View>
        <Avatar
          firstName={user?.user_fname}
          lastName={user?.user_lname}
          photo={user?.profile_photo ?? null}
          size={48}
        />
      </View>

      {/* Metric cards */}
      <View style={styles.metrics}>
        <MetricCard count={todayRides.length} label="Pending rides" color={PENDING_COLOR} />
        <MetricCard count={nextDayRides.length} label="Next day rides" color={NEXTDAY_COLOR} />
      </View>

      <SectionHeader title="Today's pending rides" />

      {error && data == null ? (
        <EmptyState
          icon="alert-circle-outline"
          tone="danger"
          title="Something went wrong"
          description={error}
        />
      ) : !data ? (
        <ActivityIndicator color={theme.brand} style={{ padding: Spacing.three }} />
      ) : todayRides.length === 0 ? (
        <EmptyState
          compact
          icon="car-outline"
          title="No rides today"
          description="No pending rides scheduled for today."
        />
      ) : (
        todayRides.map((item: Booking) => (
          <BookingCard key={item.booking_id} booking={item} onPress={() => openBooking(item.booking_id)} />
        ))
      )}

      <SectionHeader title="Next day's rides" />

      {data && nextDayRides.length === 0 ? (
        <EmptyState
          compact
          icon="calendar-outline"
          title="Nothing yet"
          description="Upcoming rides for tomorrow will appear here."
        />
      ) : (
        data &&
        nextDayRides.map((item: Booking) => (
          <BookingCard key={item.booking_id} booking={item} onPress={() => openBooking(item.booking_id)} />
        ))
      )}

      <SectionHeader title="Recent rides" />

      {data && history.length === 0 ? (
        <EmptyState
          compact
          icon="time-outline"
          title="No history"
          description="Your completed rides will show up here."
        />
      ) : (
        data &&
        history.map((item: HistoryBooking) => (
          <Pressable
            key={item.booking_id}
            onPress={() => openBooking(item.booking_id)}
            style={({ pressed }) => (pressed ? styles.pressed : null)}>
            <Card style={styles.historyCard}>
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
              <View style={styles.historyMetaRow}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text style={[styles.historyMeta, { color: theme.textSecondary }]}>
                  {item.pickup_date} · Completed
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function MetricCard({ count, label, color }: { count: number; label: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.metricNumber, { color: theme.text }]}>{count}</Text>
      <View style={styles.metricLabelRow}>
        <View style={[styles.metricDot, { backgroundColor: color }]} />
        <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  greetingCopy: { flex: 1 },
  greetingText: { fontSize: 14, fontWeight: 500 },
  greetingName: { fontSize: 24, fontWeight: 800, marginTop: 2 },

  metrics: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  metricNumber: { fontSize: 34, fontWeight: 800, lineHeight: 38 },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  metricDot: { width: 8, height: 8, borderRadius: 4 },
  metricLabel: { fontSize: 13, fontWeight: 600 },

  pressed: { opacity: 0.92 },
  historyCard: { marginBottom: Spacing.two },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  historyRoute: { flex: 1, gap: 4 },
  historyLocation: { fontSize: 15, fontWeight: 600 },
  historyFare: { fontSize: 16, fontWeight: 800 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  historyMeta: { fontSize: 12 },
});
