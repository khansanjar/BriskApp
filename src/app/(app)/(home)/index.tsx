// src/app/(app)/(home)/index.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
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
import { DriverStatusMeta, ScreenHorizontalMargin, Spacing, TAB_BAR_BOTTOM_OFFSET, TAB_BAR_HEIGHT } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
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
  const { isLandscape, scale, verticalScale, moderateScale, hp } = useResponsive();
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllRides, setShowAllRides] = useState(false);
  const [hideEarnings, setHideEarnings] = useState(false);

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

  // Sirf useFocusEffect rakha hai taake double network calls na hon
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

  useFocusEffect(
    useCallback(() => {
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
    }, [nextRide, blinkAnim])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleHideEarnings = useCallback(() => {
    setHideEarnings((prev) => !prev);
  }, []);

  const openBooking = (id: number) => router.push(`/(app)/(home)/booking/${id}`);

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen map background */}
<View style={StyleSheet.absoluteFill}>
          <RideMap booking={featured} />
      </View>

      {/* Fixed top header */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: insets.top + verticalScale(Spacing.three),
        paddingHorizontal: scale(Spacing.four),
        paddingBottom: verticalScale(Spacing.three),
        backgroundColor: theme.surface,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.three) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: moderateScale(22), fontWeight: '800', color: theme.text }}>
              Hi {user?.user_fname ?? 'Driver'}
            </Text>

            {nextRide ? (
              <Animated.Text style={{
                fontSize: moderateScale(18),
                fontWeight: '900',
                color: '#ff0000c0',
                marginTop: verticalScale(2),
                opacity: blinkAnim,
              }}>
                Next ride {format12HourTime(nextRide.pickup_time)}
              </Animated.Text>
            ) : (
              <Text style={{ fontSize: moderateScale(14), fontWeight: '500', marginTop: verticalScale(2), color: theme.textSecondary }}>
                You are online
              </Text>
            )}
          </View>
          <Avatar
            firstName={user?.user_fname}
            lastName={user?.user_lname}
            photo={user?.profile_photo ?? null}
            size={scale(48)}
          />
        </View>
      </View>

      {/* Floating Overlay for pull-to-refresh & controls */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand}
            progressViewOffset={insets.top + 60}
          />
        }
      >
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + verticalScale(TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT + Spacing.three),
          marginHorizontal: ScreenHorizontalMargin,
          gap: verticalScale(Spacing.three),
          zIndex: 10,
        }}>
          {activeToday && (
            <Pressable
              onPress={() => openBooking(activeToday.booking_id)}
              style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}>
              <View style={{
                borderRadius: moderateScale(20),
                paddingHorizontal: scale(Spacing.three),
                paddingVertical: verticalScale(Spacing.two),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: scale(6) },
                shadowOpacity: 0.16,
                shadowRadius: scale(10),
                elevation: 6,
                backgroundColor: theme.surface,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
                  <View style={{
                    width: scale(36),
                    height: scale(36),
                    borderRadius: moderateScale(10),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.brandSoft,
                  }}>
                    <Ionicons name="navigate" size={scale(20)} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1, gap: verticalScale(1), minWidth: 0 }}>
                    <Text style={{ fontSize: moderateScale(13), fontWeight: '700', flexShrink: 1, color: theme.text }} numberOfLines={1}>
                      {activeToday.pickup_location}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: moderateScale(11), fontWeight: '500', color: theme.textSecondary, flexShrink: 1 }}>
                      {DriverStatusMeta[activeToday.driver_status]?.label ?? activeToday.driver_status}
                    </Text>
                  </View>
                  <StatusBadge status={activeToday.driver_status} />
                </View>
              </View>
            </Pressable>
          )}

          {/* Earnings card */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: verticalScale(Spacing.two),
            paddingHorizontal: scale(Spacing.four),
            borderRadius: moderateScale(20),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: scale(6) },
            shadowOpacity: 0.15,
            shadowRadius: scale(10),
            elevation: 6,
            backgroundColor: theme.brand,
            position: 'relative',
          }}>
            <Pressable onPress={toggleHideEarnings} hitSlop={8} style={{ position: 'absolute', top: verticalScale(Spacing.one), right: scale(Spacing.two), zIndex: 1 }}>
              <Ionicons name={hideEarnings ? 'eye-off-outline' : 'eye-outline'} size={scale(20)} color={theme.brandText} />
            </Pressable>

            <View style={{ flex: 1, gap: verticalScale(2) }}>
              <Text style={{ fontSize: moderateScale(11), fontWeight: '600', opacity: 0.85, color: theme.brandText }}>Today&apos;s earnings</Text>
              <Text style={{ fontSize: moderateScale(20), fontWeight: '800', lineHeight: verticalScale(24), color: theme.brandText }} numberOfLines={1} adjustsFontSizeToFit>
                {hideEarnings ? '******' : (data ? formatCurrency(dayEarnings?.amount ?? 0) : '—')}
              </Text>
            </View>

            {/* Fixed line divider */}
            <View style={{ width: scale(1), alignSelf: 'stretch', opacity: 0.3, marginHorizontal: scale(Spacing.three), backgroundColor: theme.brandText }} />

            <View style={{ flex: 1, gap: verticalScale(2) }}>
              <Text style={{ fontSize: moderateScale(11), fontWeight: '600', opacity: 0.85, color: theme.brandText }}>Rides today</Text>
              <Text style={{ fontSize: moderateScale(20), fontWeight: '800', lineHeight: verticalScale(24), color: theme.brandText }}>
                {hideEarnings ? '**' : (data ? dayEarnings?.rides_count ?? 0 : '—')}
              </Text>
            </View>
          </View>

          {/* Upcoming rides card */}
          <View style={{
            borderRadius: moderateScale(20),
            paddingHorizontal: scale(Spacing.four),
            paddingVertical: verticalScale(Spacing.two),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: scale(6) },
            shadowOpacity: 0.15,
            shadowRadius: scale(10),
            elevation: 6,
            minHeight: verticalScale(100),
            backgroundColor: theme.surface,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: verticalScale(Spacing.one) }}>
              <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: theme.text }}>Upcoming rides</Text>
              <Pressable onPress={() => setShowAllRides(true)} hitSlop={8}>
                <Text style={{ fontSize: moderateScale(15), fontWeight: '600', color: theme.brand }}>View All</Text>
              </Pressable>
            </View>

            {error && data == null ? (
              <EmptyStateInline icon="alert-circle-outline" tone="danger" title="Something went wrong" description={error} />
            ) : !data ? (
              <ActivityIndicator color={theme.brand} style={{ padding: Spacing.three }} />
            ) : assignedToday[0] ? (
              <Pressable
                onPress={() => openBooking(assignedToday[0].booking_id)}
                style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}>
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
      </ScrollView>

      {/* Modal: all rides for the current day */}
      <Modal visible={showAllRides} animationType="slide" transparent>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(21, 19, 43, 0.55)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            borderTopLeftRadius: moderateScale(24),
            borderTopRightRadius: moderateScale(24),
            paddingHorizontal: scale(Spacing.four),
            paddingTop: verticalScale(Spacing.three),
            paddingBottom: verticalScale(Spacing.six),
            maxHeight: isLandscape ? hp(70) : '80%',
            backgroundColor: theme.surface,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(Spacing.three) }}>
              <Text style={{ fontSize: moderateScale(20), fontWeight: '800', color: theme.text }}>Today&apos;s rides</Text>
              <Pressable onPress={() => setShowAllRides(false)} hitSlop={8}>
                <View style={{
                  width: scale(36),
                  height: scale(36),
                  borderRadius: moderateScale(18),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.backgroundElement,
                }}>
                  <Ionicons name="close" size={scale(20)} color={theme.text} />
                </View>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(Spacing.six + Spacing.three) + insets.bottom }} showsVerticalScrollIndicator={false}>
              {assignedToday.length === 0 ? (
                <EmptyStateInline compact icon="car-outline" title="No rides" description="No assigned rides scheduled for today." />
              ) : (
                <View style={{ gap: verticalScale(Spacing.three) }}>
                  {assignedToday.map((item) => (
                    <Pressable
                      key={item.booking_id}
                      onPress={() => {
                        setShowAllRides(false);
                        openBooking(item.booking_id);
                      }}
                      style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}>
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
  const { scale, verticalScale, moderateScale } = useResponsive();
  return (
    <View style={{
      borderRadius: moderateScale(16),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      overflow: 'hidden',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(Spacing.two), padding: scale(Spacing.two) }}>
        <View style={{
          width: scale(40),
          height: scale(40),
          borderRadius: moderateScale(12),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.brandSoft,
        }}>
          <Ionicons name="car-outline" size={scale(22)} color={theme.brand} />
        </View>
        <View style={{ flex: 1, gap: verticalScale(2), minWidth: 0 }}>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '700', flexShrink: 1, color: theme.text }} numberOfLines={1}>
            {booking.pickup_location}
          </Text>
          <Text style={{ fontSize: moderateScale(12), fontWeight: '700', marginVertical: verticalScale(2), color: theme.textSecondary }}>↓</Text>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '700', flexShrink: 1, color: theme.text }} numberOfLines={1}>
            {booking.dropoff_location}
          </Text>
        </View>
        <StatusBadge status={isRideMissed(booking) ? 'missed' : booking.driver_status} />
      </View>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(Spacing.two),
        paddingTop: verticalScale(Spacing.two),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.border,
        paddingHorizontal: scale(Spacing.two),
        paddingBottom: verticalScale(Spacing.two),
      }}>
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
  const { scale, verticalScale, moderateScale } = useResponsive();
  const isDanger = tone === 'danger';
  const iconColor = isDanger ? theme.danger : theme.textSecondary;
  const circleBg = isDanger ? theme.dangerSoft : theme.surfaceSecondary;

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: compact ? verticalScale(Spacing.two) : verticalScale(Spacing.three),
      gap: verticalScale(Spacing.one),
    }}>
      <View style={{
        width: scale(64),
        height: scale(64),
        borderRadius: moderateScale(32),
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(Spacing.one),
        backgroundColor: circleBg,
      }}>
        <Ionicons name={icon ?? 'car-outline'} size={scale(32)} color={iconColor} />
      </View>
      <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: theme.text }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: moderateScale(13), textAlign: 'center', lineHeight: verticalScale(18), maxWidth: 260, color: theme.textSecondary }}>{description}</Text>
      ) : null}
    </View>
  );
}

function Meta({ icon, text }: { icon: IoniconName; text: string }) {
  const theme = useTheme();
  const { scale, moderateScale } = useResponsive();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
      <Ionicons name={icon} size={scale(14)} color={theme.textSecondary} />
      <Text numberOfLines={1} style={{ fontSize: moderateScale(13), fontWeight: '500', color: theme.textSecondary, flexShrink: 1 }}>{text}</Text>
    </View>
  );
}