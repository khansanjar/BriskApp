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
  moderateScale,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  theme: ReturnType<typeof useTheme>;
  moderateScale: (n: number, factor?: number) => number;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={moderateScale(15)} color={theme.textSecondary} />
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

  const pax = (booking as { pax_count?: number; passengers?: number }).pax_count ?? (booking as { passengers?: number }).passengers;
  const childSeats = (booking as { child_seats?: number }).child_seats;
  const vehicleType = (booking as { vehicle_type?: string }).vehicle_type;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <Card>
        {/* ================= TOP SECTION ================= */}
        {/* 1. TOP ROW: Prominent Big Time/Date (Left) & Large Fare Display (Right) */}
        <View style={styles.topRow}>
          <Text
            style={{
              fontSize: moderateScale(17),
              fontWeight: '700',
              color: theme.text,
              flex: 1,
            }}
            numberOfLines={1}>
            {formatDate(booking.pickup_date)} {formatTime(booking.pickup_time)}
          </Text>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: moderateScale(11),
                fontWeight: '500',
                color: theme.textSecondary,
              }}>
              You get
            </Text>
            <Text
              style={{
                fontSize: moderateScale(18),
                fontWeight: '800',
                color: theme.text,
              }}
              numberOfLines={1}>
              {formatCurrency(booking.total_fare)}
            </Text>
          </View>
        </View>

        {/* 2. Status Badge Row */}
        <View style={{ marginTop: verticalScale(Spacing.one), alignItems: 'flex-start' }}>
          <StatusBadge status={badgeStatus} />
        </View>

        {/* ================= DIVIDER ================= */}
        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.border,
              marginVertical: verticalScale(Spacing.two),
            },
          ]}
        />

        {/* ================= BOTTOM SECTION ================= */}
        {/* 3. Ride Meta Indicators Row (Passengers, Child Seats, Vehicle) */}
        <View
          style={[
            styles.metaRow,
            {
              gap: scale(Spacing.two + Spacing.half),
              marginBottom: verticalScale(Spacing.two),
            },
          ]}>
          {typeof pax === 'number' ? (
            <MemoizedMeta
              icon="people-outline"
              text={`${pax} Pax`}
              theme={theme}
              moderateScale={moderateScale}
            />
          ) : null}

          {typeof childSeats === 'number' && childSeats > 0 ? (
            <MemoizedMeta
              icon="person-add-outline"
              text={`${childSeats} Seats`}
              theme={theme}
              moderateScale={moderateScale}
            />
          ) : null}

          {vehicleType ? (
            <MemoizedMeta
              icon="car-outline"
              text={vehicleType}
              theme={theme}
              moderateScale={moderateScale}
            />
          ) : null}
        </View>

        {/* 4. Route Timeline Section (Pickup -> Dashed Line -> Dropoff) */}
        <View style={styles.routeWrap}>
          {/* Pickup Point */}
          <View style={[styles.routePoint, { gap: scale(Spacing.two) }]}>
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.hollowDot,
                  {
                    borderColor: theme.textSecondary,
                    width: scale(10),
                    height: scale(10),
                    borderRadius: scale(5),
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.location, { color: theme.text, fontSize: moderateScale(13) }]}
              numberOfLines={1}>
              {booking.pickup_location}
            </Text>
          </View>

          {/* Dotted Vertical Connector Line */}
          <View
            style={[
              styles.dashedLineContainer,
              {
                height: verticalScale(12),
                marginLeft: scale(11),
              },
            ]}>
            <View
              style={[
                styles.dashedLine,
                { borderColor: theme.border },
              ]}
            />
          </View>

          {/* Dropoff Point */}
          <View style={[styles.routePoint, { gap: scale(Spacing.two) }]}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="location"
                size={moderateScale(15)}
                color={theme.brand}
              />
            </View>
            <Text
              style={[styles.location, { color: theme.text, fontSize: moderateScale(13) }]}
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
  pressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  metaText: {
    fontWeight: '600',
  },
  routeWrap: {
    flexDirection: 'column',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hollowDot: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  dashedLineContainer: {
    justifyContent: 'center',
  },
  dashedLine: {
    height: '100%',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    width: 1,
  },
  location: {
    fontWeight: '500',
    flex: 1,
  },
});