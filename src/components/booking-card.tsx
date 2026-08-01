import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { type ComponentProps } from 'react';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import { isRideMissed } from '@/lib/booking-status';
import { useTheme } from '@/hooks/use-theme';
import type { Booking } from '@/lib/api';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type MetaProps = {
  icon: IoniconName;
  text: string;
  theme: ReturnType<typeof useTheme>;
};

function Meta({ icon, text, theme }: MetaProps) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1} flexShrink={1}>{text}</Text>
    </View>
  );
}

const MemoizedMeta = memo(Meta);

export const BookingCard = memo(function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { isLandscape } = useResponsive();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <Card>
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <View style={styles.routeWrap}>
            <View style={styles.routePoint}>
              <View style={[styles.pin, { backgroundColor: theme.brand }]} />
              <Text style={[styles.location, { color: theme.text }]} numberOfLines={1}>
                {booking.pickup_location}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.pin, { backgroundColor: theme.danger }]} />
              <Text style={[styles.location, { color: theme.text }]} numberOfLines={1}>
                {booking.dropoff_location}
              </Text>
            </View>
          </View>
          <StatusBadge status={isRideMissed(booking) ? 'missed' : booking.driver_status} />
        </View>

        <View style={[styles.metaRow, isLandscape && styles.metaRowLandscape]}>
          <MemoizedMeta icon="calendar-outline" text={formatDate(booking.pickup_date)} theme={theme} />
          <MemoizedMeta icon="time-outline" text={formatTime(booking.pickup_time)} theme={theme} />
          {booking.vehicle_type ? (
            <MemoizedMeta icon="car-outline" text={booking.vehicle_type} theme={theme} />
          ) : null}
        </View>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.customer}>
            <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
              {booking.customer?.name ?? 'Customer'}
            </Text>
            {booking.customer?.phone ? (
              <Text style={[styles.customerPhone, { color: theme.textSecondary }]} numberOfLines={1}>
                {booking.customer.phone}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.fare, { color: theme.text }]}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeWrap: { flex: 1, gap: 10 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pin: { width: Spacing.two + Spacing.half, height: Spacing.two + Spacing.half, borderRadius: Spacing.two + Spacing.half },
  routeLine: {
    height: 14,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginLeft: Spacing.one,
  },
  location: { fontSize: 15, fontWeight: 600, flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  metaRowLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: 500 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  customer: { flex: 1, minWidth: 0 },
  customerName: { fontSize: 14, fontWeight: 700 },
  customerPhone: { fontSize: 12 },
  fare: { fontSize: 18, fontWeight: 800 },
});
