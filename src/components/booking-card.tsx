import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spacing } from '@/constants/theme';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import type { Booking } from '@/lib/api';

export function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <Card>
        <View style={styles.header}>
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
          <StatusBadge status={booking.driver_status} />
        </View>

        <View style={styles.metaRow}>
          <Meta icon="📅" text={formatDate(booking.pickup_date)} />
          <Meta icon="🕒" text={formatTime(booking.pickup_time)} />
          {booking.vehicle_type ? <Meta icon="🚗" text={booking.vehicle_type} /> : null}
        </View>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.customer}>
            <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
              {booking.customer.name}
            </Text>
            <Text style={[styles.customerPhone, { color: theme.textSecondary }]}>
              {booking.customer.phone}
            </Text>
          </View>
          <Text style={[styles.fare, { color: theme.text }]}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={[styles.metaText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  routeWrap: { flex: 1, gap: 10 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pin: { width: 10, height: 10, borderRadius: 5 },
  routeLine: {
    height: 14,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginLeft: 4,
  },
  location: { fontSize: 15, fontWeight: 600, flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon: { fontSize: 14 },
  metaText: { fontSize: 13, fontWeight: 500 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  customer: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: 700 },
  customerPhone: { fontSize: 12 },
  fare: { fontSize: 18, fontWeight: 800 },
});
