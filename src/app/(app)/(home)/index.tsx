// src/app/(app)/(home)/index.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RideMap } from '@/components/RideMap';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { DriverStatusMeta, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/use-theme';
import { getDashboard, type Booking, type DashboardData, type User } from '@/lib/api';
import { isRideMissed } from '@/lib/booking-status';
import { formatCurrency, formatTime } from '@/lib/format';
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

// 12-Hour Time Formatter
function format12HourTime(timeStr: string): string {
  if (!timeStr) return '';
  const dateObj = new Date(timeStr);
  if (!Number.isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return timeStr;
}

const todayKey = localKey(0);

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, screenHeight, scale, verticalScale, wp, hp } = useResponsive();
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllRides, setShowAllRides] = useState(false);

  // Blinking animation for Red Neon Next Ride
  const blinkAnim = useRef(new Animated.Value(1)).current;

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
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
      if (!cancelled) getUser<User>().then(setUser);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!cancelled) await load();
        if (!cancelled) getUser<User>().then(setUser);
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const upcoming = data?.upcoming_bookings ?? [];
  const todayRides = upcoming.filter((b) => dateKey(b.pickup_date) === todayKey);
  const dayEarnings = data?.earnings?.today;

  const assignedToday = todayRides.filter((b) => b.driver_status === 'assigned');
  const activeToday = todayRides.find((b) =>
    ['heading_to_pickup', 'arrived', 'in_progress'].includes(b.driver_status)
  );

  const featured = activeToday ?? assignedToday[0] ?? null;
  const nextRide = assignedToday[0] ?? null;

  // Red Neon Blinking loop trigger
  useEffect(() => {
    if (nextRide) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [nextRide, blinkAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openBooking = (id: number) => router.push(`/(app)/(home)/booking/${id}`);

  return (
    <View style={styles.root}>
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />

      {/* Full-screen map background */}
      <View style={styles.mapContainer}>
        <RideMap booking={featured} />
      </View>

      {/* Fixed top header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three, backgroundColor: theme.surface }]}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingCopy}>
            <Text style={[styles.greetingText, { color: theme.text }]}>
              Hi {user?.user_fname ?? 'Driver'}
            </Text>

            {nextRide ? (
              <Animated.Text style={[styles.neonText, { opacity: blinkAnim }]}>
                Next ride {format12HourTime(nextRide.pickup_time)}
              </Animated.Text>
            ) : (
              <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>
                You are online
              </Text>
            )}
          </View>
          <Avatar
            firstName={user?.user_fname}
            lastName={user?.user_lname}
            photo={user?.profile_photo ?? null}
            size={48}
          />
        </View>
      </View>

      {/* Floating bottom cards */}
      <View style={[styles.bottomCardsContainer, isLandscape && styles.bottomCardsContainerLandscape]}>
        {activeToday && (
          <Pressable
            onPress={() => openBooking(activeToday.booking_id)}
            style={({ pressed }) => (pressed ? styles.pressed : null)}>
            <View style={[styles.activeRideCard, { backgroundColor: theme.surface }]}>
              <View style={styles.activeRideHeader}>
                <View style={[styles.activeRideIcon, { backgroundColor: theme.brandSoft }]}>
                  <Ionicons name="navigate" size={20} color={theme.brand} />
                </View>
                <View style={styles.activeRideCopy}>
                  <Text style={[styles.activeRideTitle, { color: theme.text }]} numberOfLines={1}>
                    {activeToday.pickup_location}
                  </Text>
                  <Text numberOfLines={1} style={[styles.activeRideStatus, { color: theme.textSecondary, flexShrink: 1 }]}>
                    {DriverStatusMeta[activeToday.driver_status]?.label ?? activeToday.driver_status}
                  </Text>
                </View>
                <StatusBadge status={activeToday.driver_status} />
              </View>
            </View>
          </Pressable>
        )}

        {/* Earnings card */}
        <View style={[styles.earningsCard, { backgroundColor: theme.brand }]}>
          <View style={styles.earningsCol}>
            <Text style={[styles.earningsLabel, { color: theme.brandText }]}>Today&apos;s earnings</Text>
            <Text style={[styles.earningsAmount, { color: theme.brandText }]} numberOfLines={1} adjustsFontSizeToFit>
              {data ? formatCurrency(dayEarnings?.amount ?? 0) : '—'}
            </Text>
          </View>
          <View style={[styles.earningsDivider, { backgroundColor: theme.brandText }]} />
          <View style={styles.earningsCol}>
            <Text style={[styles.earningsLabel, { color: theme.brandText }]}>Rides today</Text>
            <Text style={[styles.earningsAmount, { color: theme.brandText }]}>
              {data ? dayEarnings?.rides_count ?? 0 : '—'}
            </Text>
          </View>
        </View>

        {/* Upcoming rides card */}
        <View style={[styles.upcomingCard, { backgroundColor: theme.surface }]}>
          <View style={styles.upcomingHeader}>
            <Text style={[styles.upcomingTitle, { color: theme.text }]}>Upcoming rides</Text>
            <Pressable onPress={() => setShowAllRides(true)} hitSlop={8}>
              <Text style={[styles.viewAll, { color: theme.brand }]}>View All</Text>
            </Pressable>
          </View>

          {error && data == null ? (
            <EmptyStateInline icon="alert-circle-outline" tone="danger" title="Something went wrong" description={error} />
          ) : !data ? (
            <ActivityIndicator color={theme.brand} style={{ padding: Spacing.three }} />
          ) : assignedToday[0] ? (
            <Pressable
              onPress={() => openBooking(assignedToday[0].booking_id)}
              style={({ pressed }) => (pressed ? styles.pressed : null)}>
              <CardCompact booking={assignedToday[0]} />
            </Pressable>
          ) : (
            <EmptyStateInline
              icon="car-outline"
              title="No upcoming rides"
              description="You have no assigned rides remaining today."
            />
          )}
        </View>
      </View>

      {/* Modal: all rides for the current day */}
      <Modal visible={showAllRides} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, maxHeight: isLandscape ? hp(70) : '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Today&apos;s rides</Text>
              <Pressable onPress={() => setShowAllRides(false)} hitSlop={8}>
                <View style={[styles.modalClose, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </View>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
              {assignedToday.length === 0 ? (
                <EmptyStateInline compact icon="car-outline" title="No rides" description="No assigned rides scheduled for today." />
              ) : (
                <View style={styles.modalList}>
                  {assignedToday.map((item) => (
                    <Pressable
                      key={item.booking_id}
                      onPress={() => {
                        setShowAllRides(false);
                        openBooking(item.booking_id);
                      }}
                      style={({ pressed }) => (pressed ? styles.pressed : null)}>
                      <CardCompact booking={item} />
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CardCompact({ booking }: { booking: Booking }) {
  const theme = useTheme();
  return (
    <View style={[styles.compactCard, { borderTopColor: theme.border }]}>
      <View style={styles.compactTop}>
        <View style={[styles.compactIcon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="car-outline" size={22} color={theme.brand} />
        </View>
        <View style={styles.compactRoute}>
          <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
            {booking.pickup_location}
          </Text>
          <Text style={[styles.compactArrow, { color: theme.textSecondary }]}>↓</Text>
          <Text style={[styles.compactPoint, { color: theme.text }]} numberOfLines={1}>
            {booking.dropoff_location}
          </Text>
        </View>
        <StatusBadge status={isRideMissed(booking) ? 'missed' : booking.driver_status} />
      </View>
      <View style={[styles.compactMeta, { borderTopColor: theme.border }]}>
        <Meta icon="time-outline" text={formatTime(booking.pickup_time)} />
        {booking.vehicle_type ? <Meta icon="car-outline" text={booking.vehicle_type} /> : null}
      </View>
    </View>
  );
}

function EmptyStateInline({
  icon,
  title,
  description,
  tone,
  compact,
}: {
  icon?: IoniconName;
  title: string;
  description?: string;
  tone?: 'default' | 'danger';
  compact?: boolean;
}) {
  const theme = useTheme();
  const isDanger = tone === 'danger';
  const iconColor = isDanger ? theme.danger : theme.textSecondary;
  const circleBg = isDanger ? theme.dangerSoft : theme.surfaceSecondary;

  return (
    <View style={[styles.emptyContainer, compact && styles.emptyContainerCompact]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: circleBg, borderColor: theme.border }]}>
        <Ionicons name={icon ?? 'car-outline'} size={32} color={iconColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>{description}</Text>
      ) : null}
    </View>
  );
}

function Meta({ icon, text }: { icon: IoniconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text numberOfLines={1} style={[styles.metaText, { color: theme.textSecondary, flexShrink: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapContainer: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  greetingCopy: { flex: 1 },
  greetingText: { fontSize: 22, fontWeight: '800' },
  greetingSub: { fontSize: 14, fontWeight: '500', marginTop: 2 },

  // Red Neon Blinking Styling
  neonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ff0000c0',
    marginTop: 2,
    // textShadowColor: '#ff2600',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  bottomCardsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    marginHorizontal: Spacing.four,
    gap: Spacing.three,
    zIndex: 10,
  },
  bottomCardsContainerLandscape: {
    bottom: 20,
    marginHorizontal: Spacing.two,
  },
  earningsCard: {
    flexDirection: 'row',
    // justifyContent:"center",
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  earningsCol: { flex: 1, gap: 2 },
  earningsDivider: { width: 1, opacity: 0.3, marginHorizontal: Spacing.three },
  earningsLabel: { fontSize: 11, fontWeight: '600', opacity: 0.85 },
  earningsAmount: { fontSize: 20, fontWeight: '800', lineHeight: 24 },

  activeRideCard: {
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  activeRideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  activeRideIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRideCopy: { flex: 1, gap: 1, minWidth: 0 },
  activeRideTitle: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  activeRideStatus: { fontSize: 11, fontWeight: '500' },

  upcomingCard: {
    borderRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    minHeight: 100,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  upcomingTitle: { fontSize: 14, fontWeight: '700' },
  viewAll: { fontSize: 15, fontWeight: '600' },

  compactCard: {
    borderRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactRoute: { flex: 1, gap: 2, minWidth: 0 },
  compactPoint: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  compactArrow: { fontSize: 12, fontWeight: '700', marginVertical: 2 },
  compactMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  emptyContainerCompact: {
    paddingVertical: Spacing.two,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },

  pressed: { opacity: 0.92 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 19, 43, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: { gap: Spacing.three },
});