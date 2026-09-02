import Ionicons from '@react-native-vector-icons/ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import type { Booking } from '@/lib/api';
import { isRideMissed } from '@/lib/booking-status';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

function MetaIcon({
  icon,
  text,
  theme,
  scale,
  moderateScale,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  moderateScale: (n: number, factor?: number) => number;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={moderateScale(14)} color={theme.textSecondary} />
      <Text
        style={[
          styles.metaText,
          { color: theme.textSecondary, fontSize: moderateScale(12) },
        ]}
        numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const MemoizedMeta = memo(MetaIcon);

export const BookingCard = memo(function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { scale, verticalScale, moderateScale } = useResponsive();

  const missed = isRideMissed(booking);
  const badgeStatus = missed ? 'missed' : booking.driver_status;

  const pax = (booking as { pax_count?: number }).pax_count;
  const bags = (booking as { luggage_count?: number }).luggage_count;
  const childSeats = (booking as { child_seats?: number }).child_seats;
  const flightNo = (booking as { flight_number?: string }).flight_number;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <Card>
        {/* 1. Top Row: Status badge (left) + Driver payout (right) */}
        <View style={[styles.topRow, { marginBottom: verticalScale(Spacing.two) }]}>
          <StatusBadge status={badgeStatus} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: moderateScale(11),
                fontWeight: '600',
                color: theme.textSecondary,
              }}>
              You get
            </Text>
            <Text
              style={{
                fontSize: moderateScale(16),
                fontWeight: '800',
                color: theme.text,
              }}
              numberOfLines={1}>
              {formatCurrency(booking.total_fare)}
            </Text>
          </View>
        </View>

        {/* 2. Date & Time Row */}
        <Text
          style={{
            fontSize: moderateScale(15),
            fontWeight: '700',
            color: theme.text,
            marginBottom: verticalScale(Spacing.two),
          }}
          numberOfLines={1}>
          {formatDate(booking.pickup_date)} · {formatTime(booking.pickup_time)}
        </Text>

        {/* 3. Ride Meta Indicators Row */}
        <View
          style={[
            styles.metaRow,
            {
              gap: scale(Spacing.three),
              marginBottom: verticalScale(Spacing.three),
            },
          ]}>
          {typeof pax === 'number' ? (
            <MemoizedMeta
              icon="people-outline"
              text={`${pax} Pax`}
              theme={theme}
              scale={scale}
              moderateScale={moderateScale}
            />
          ) : null}
          {typeof bags === 'number' ? (
            <MemoizedMeta
              icon="briefcase-outline"
              text={`${bags} Bags`}
              theme={theme}
              scale={scale}
              moderateScale={moderateScale}
            />
          ) : null}
          {typeof childSeats === 'number' && childSeats > 0 ? (
            <MemoizedMeta
              icon="person-add-outline"
              text={`${childSeats} Seats`}
              theme={theme}
              scale={scale}
              moderateScale={moderateScale}
            />
          ) : null}
          {flightNo ? (
            <MemoizedMeta
              icon="airplane-outline"
              text={`Flight ${flightNo}`}
              theme={theme}
              scale={scale}
              moderateScale={moderateScale}
            />
          ) : null}
        </View>

        {/* 4. Route Section: Vertical Timeline */}
        <View style={[styles.routeWrap, { gap: verticalScale(Spacing.two) }]}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: theme.brand }]} />
            <Text
              style={[styles.location, { color: theme.text, fontSize: moderateScale(14) }]}
              numberOfLines={1}>
              {booking.pickup_location}
            </Text>
          </View>

          <View style={[styles.routeLine, { marginLeft: scale(Spacing.one) }]} />

          <View style={styles.routePoint}>
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: theme.danger,
                  width: scale(Spacing.two + Spacing.half),
                  height: scale(Spacing.two + Spacing.half),
                  borderRadius: scale(Spacing.half),
                },
              ]}
            />
            <Text
              style={[styles.location, { color: theme.text, fontSize: moderateScale(14) }]}
              numberOfLines={1}>
              {booking.dropoff_location}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaText: {
    fontWeight: '500',
  },
  routeWrap: {
    flexDirection: 'column',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.two,
  },
  pin: {
    width: Spacing.two + Spacing.half,
    height: Spacing.two + Spacing.half,
  },
  routeLine: {
    height: 14,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  location: {
    fontWeight: '600',
    flex: 1,
  },
});