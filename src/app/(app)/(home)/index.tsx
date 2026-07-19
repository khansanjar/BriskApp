// src/app/(app)/(home)/index.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/ui/status-badge';
import { RideMap } from '@/components/RideMap';
import { SectionHeader } from '@/components/section-header';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDashboard, type Booking, type DashboardData, type User } from '@/lib/api';
import { formatCurrency, formatTime } from '@/lib/format';
import { isRideMissed } from '@/lib/booking-status';
import { getUser } from '@/lib/storage';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

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

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
  const dayEarnings = data?.earnings?.today;

  const featured = todayRides[0] ?? nextDayRides[0] ?? null;

  // Next upcoming ride across today + tomorrow, used for the header subtitle.
  const nextRide = [...todayRides, ...nextDayRides][0] ?? null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.four }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
        }
        showsVerticalScrollIndicator={false}>
        {/* Greeting + avatar in a single horizontal row */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingCopy}>
            <Text style={[styles.greetingText, { color: theme.textSecondary }]}>
              Hi {user?.user_fname ?? 'Driver'} 👋
            </Text>
            <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>
              {nextRide ? `Next ride ${formatTime(nextRide.pickup_time)}` : 'You are online'}
            </Text>
          </View>
          <Avatar
            firstName={user?.user_fname}
            lastName={user?.user_lname}
            photo={user?.profile_photo ?? null}
            size={48}
          />
        </View>

        {/* Earnings — single rounded primary stat card */}
        <EarningsCard
          amount={dayEarnings?.amount ?? 0}
          rides={dayEarnings?.rides_count ?? 0}
          loading={!data}
        />

        <SectionHeader title="Upcoming rides" />

        {error && data == null ? (
          <EmptyState icon="alert-circle-outline" tone="danger" title="Something went wrong" description={error} />
        ) : !data ? (
          <ActivityIndicator color={theme.brand} style={{ padding: Spacing.three }} />
        ) : featured ? (
          <UpcomingRideCard booking={featured} onPress={() => openBooking(featured.booking_id)} />
        ) : (
          <EmptyState
            compact
            icon="car-outline"
            title="No rides yet"
            description="Your next assigned ride will appear here."
          />
        )}

        {/* Gap between the upcoming ride card and the map */}
        <View style={styles.mapGap} />

        {/* Map — full-bleed: touches the bottom and both side edges */}
        <View style={styles.mapSection}>
          <RideMap booking={featured} />
        </View>
      </ScrollView>
    </View>
  );
}

function EarningsCard({
  amount,
  rides,
  monthAmount,
  monthRides,
  loading,
}: {
  amount: number;
  rides: number;
  monthAmount?: number;
  monthRides?: number;
  loading: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.earningsCard, { backgroundColor: theme.brand }]}>
      {loading ? (
        <ActivityIndicator color={theme.brandText} style={styles.earningsLoader} />
      ) : (
        <View style={styles.earningsColumns}>
          <View style={styles.earningsCol}>
            <Text style={[styles.earningsLabel, { color: theme.brandText }]}>Today's earnings</Text>
            <Text style={[styles.earningsAmount, { color: theme.brandText }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(amount)}
            </Text>
          </View>
          <View style={[styles.earningsDivider, { backgroundColor: theme.brandText }]} />
          <View style={styles.earningsCol}>
            <Text style={[styles.earningsLabel, { color: theme.brandText }]}>Rides today</Text>
            <Text style={[styles.earningsAmount, { color: theme.brandText }]}>{rides}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function UpcomingRideCard({ booking, onPress }: { booking: Booking; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <Card style={styles.upcomingCard}>
        <View style={styles.upcomingTop}>
          <View style={[styles.upcomingIcon, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name="car-outline" size={22} color={theme.brand} />
          </View>
          <View style={styles.upcomingRoute}>
            <Text style={[styles.upcomingPoint, { color: theme.text }]} numberOfLines={1}>
              {booking.pickup_location}
            </Text>
            <Text style={[styles.upcomingArrow, { color: theme.textSecondary }]}>↓</Text>
            <Text style={[styles.upcomingPoint, { color: theme.text }]} numberOfLines={1}>
              {booking.dropoff_location}
            </Text>
          </View>
          <StatusBadge status={isRideMissed(booking) ? 'missed' : booking.driver_status} />
        </View>
        <View style={[styles.upcomingMeta, { borderTopColor: theme.border }]}>
          <Meta icon="time-outline" text={formatTime(booking.pickup_time)} />
          {booking.vehicle_type ? <Meta icon="car-outline" text={booking.vehicle_type} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  greetingCopy: { flex: 1 },
  greetingText: { fontSize: 22, fontWeight: 800 },
  greetingSub: { fontSize: 14, fontWeight: 500, marginTop: 2 },

  earningsCard: {
    borderRadius: 20,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    shadowColor: '#3D3796',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  earningsColumns: { flexDirection: 'row', alignItems: 'stretch' },
  earningsCol: { flex: 1, gap: 4 },
  earningsDivider: { width: 1, opacity: 0.3, marginHorizontal: Spacing.three },
  earningsLabel: { fontSize: 13, fontWeight: 600, opacity: 0.85 },
  earningsAmount: { fontSize: 24, fontWeight: 800, lineHeight: 28 },
  earningsLoader: { alignSelf: 'flex-start', marginVertical: Spacing.two },

  upcomingCard: { marginBottom: Spacing.three },
  upcomingTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  upcomingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingRoute: { flex: 1, gap: 2 },
  upcomingPoint: { fontSize: 15, fontWeight: 700 },
  upcomingArrow: { fontSize: 12, fontWeight: 700, marginVertical: 2 },
  upcomingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  pressed: { opacity: 0.92 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: 500 },

  mapSection: {
    marginTop: 0,
    marginHorizontal: -Spacing.four,
    marginBottom: 0,
    height: 320,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3D3796',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  mapGap: { height: Spacing.three },

  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
});

function Meta({ icon, text }: { icon: IoniconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text style={[styles.metaText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}
