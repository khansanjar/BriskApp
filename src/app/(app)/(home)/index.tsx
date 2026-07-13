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
import { getDashboard, type Booking, type DashboardData, type HistoryBooking } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

export default function DashboardScreen() {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
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
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openBooking = (id: number) => router.push(`/(app)/(home)/booking/${id}`);

  return (
    <Screen
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
        ),
      }}>
      <Card style={styles.earnings}>
        <Text style={[styles.earningsLabel, { color: theme.textSecondary }]}>Today</Text>
        <Text style={[styles.earningsValue, { color: theme.brand }]}>
          {formatCurrency(data?.earnings.today.amount ?? 0)}
        </Text>
        <Text style={[styles.earningsSub, { color: theme.textSecondary }]}>
          {data?.earnings.today.rides_count ?? 0} rides
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.earningsLabel, { color: theme.textSecondary }]}>This month</Text>
        <Text style={[styles.earningsMonth, { color: theme.text }]}>
          {formatCurrency(data?.earnings.this_month.amount ?? 0)}
        </Text>
        <Text style={[styles.earningsSub, { color: theme.textSecondary }]}>
          {data?.earnings.this_month.rides_count ?? 0} rides
        </Text>
      </Card>

      <SectionHeader title="Upcoming bookings" />

      {error && data == null ? (
        <EmptyState icon="⚠️" title="Something went wrong" description={error} />
      ) : !data ? (
        <ActivityIndicator color={theme.brand} style={{ padding: Spacing.four }} />
      ) : data.upcoming_bookings.length === 0 ? (
        <EmptyState icon="🚗" title="No upcoming rides" description="New assignments will show up here." />
      ) : (
        data.upcoming_bookings.map((item: Booking) => (
          <BookingCard key={item.booking_id} booking={item} onPress={() => openBooking(item.booking_id)} />
        ))
      )}

      {data && data.recent_history.length > 0 ? (
        <>
          <SectionHeader title="Recent history" />
          {data.recent_history.map((item: HistoryBooking) => (
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
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  earnings: { marginBottom: Spacing.three },
  earningsLabel: { fontSize: 13, fontWeight: 600, textTransform: 'uppercase' },
  earningsValue: { fontSize: 34, fontWeight: 800, marginTop: 4 },
  earningsMonth: { fontSize: 22, fontWeight: 800, marginTop: 4 },
  earningsSub: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginVertical: Spacing.three },
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
