import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spacing } from '@/constants/theme';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import type { Booking, DriverStatus } from '@/lib/api';

// Exact state machine: assigned → heading_to_pickup → arrived → in_progress → completed.
// Only the immediate next state is offered, so no invalid transitions are possible.
const NEXT_LABEL: Record<DriverStatus, string | null> = {
  assigned: 'Head to pickup',
  heading_to_pickup: 'Mark arrived',
  arrived: 'Start trip',
  in_progress: 'Complete trip',
  completed: null,
};

const NEXT_STATE: Record<DriverStatus, DriverStatus | null> = {
  assigned: 'heading_to_pickup',
  heading_to_pickup: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

const TRANSITIONS: Record<DriverStatus, { value: DriverStatus; label: string }[]> = (Object.keys(
  NEXT_STATE
) as DriverStatus[]).reduce((acc, status) => {
  const next = NEXT_STATE[status];
  acc[status] = next ? [{ value: next, label: NEXT_LABEL[status]! }] : [];
  return acc;
}, {} as Record<DriverStatus, { value: DriverStatus; label: string }[]>);

export function BookingDetail({
  booking,
  onUpdate,
  updating,
}: {
  booking: Booking;
  onUpdate: (status: DriverStatus) => void;
  updating: boolean;
}) {
  const theme = useTheme();
  const next = TRANSITIONS[booking.driver_status] ?? [];

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.statusRow}>
          <StatusBadge status={booking.driver_status} />
          <Text style={[styles.fare, { color: theme.text }]}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>

        <View style={styles.timeline}>
          <Point color={theme.brand} label="Pickup" />
          <Line />
          <View style={styles.locationBlock}>
            <Text style={[styles.location, { color: theme.text }]}>
              {booking.pickup_location}
            </Text>
          </View>
          <View style={{ height: 12 }} />
          <Point color={theme.danger} label="Dropoff" />
          <Line />
          <View style={styles.locationBlock}>
            <Text style={[styles.location, { color: theme.text }]}>
              {booking.dropoff_location}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Row label="Date" value={formatDate(booking.pickup_date)} icon="📅" />
        <Row label="Time" value={formatTime(booking.pickup_time)} icon="🕒" />
        <Row label="Vehicle" value={booking.vehicle_type ?? '—'} icon="🚗" />
        <Row label="Order ID" value={booking.order_id} icon="🧾" />
        {booking.started_at ? (
          <Row label="Started" value={formatDateTime(booking.started_at)} icon="▶️" />
        ) : null}
        {booking.completed_at ? (
          <Row label="Completed" value={formatDateTime(booking.completed_at)} icon="✅" />
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer</Text>
        <View style={styles.customerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: theme.text }]}>
              {booking.customer.name}
            </Text>
            {booking.customer.email ? (
              <Text style={[styles.customerSub, { color: theme.textSecondary }]}>
                {booking.customer.email}
              </Text>
            ) : null}
            <Text style={[styles.customerSub, { color: theme.textSecondary }]}>
              {booking.customer.phone}
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`tel:${booking.customer.phone}`)}
            style={[styles.callButton, { backgroundColor: theme.brandSoft }]}>
            <Text style={[styles.callText, { color: theme.brand }]}>Call</Text>
          </Pressable>
        </View>
      </Card>

      {booking.notes ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.notes, { color: theme.textSecondary }]}>{booking.notes}</Text>
        </Card>
      ) : null}

      {next.length > 0 ? (
        <View style={styles.actions}>
          {next.map((item, index) => (
            <Button
              key={item.value}
              title={item.label}
              variant={index === 0 ? 'primary' : 'secondary'}
              loading={updating}
              onPress={() => onUpdate(item.value)}
              style={next.length > 1 ? styles.actionButton : null}
            />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={[styles.done, { color: theme.success }]}>
            This ride is completed. 🎉
          </Text>
        </Card>
      )}
    </View>
  );
}

function Point({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.pointRow}>
      <View style={[styles.point, { backgroundColor: color }]} />
      <Text style={[styles.pointLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Line() {
  return <View style={styles.line} />;
}

function Row({ label, value, icon }: { label: string; value: string; icon: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
        {icon} {label}
      </Text>
      <Text style={[styles.rowValue, { color: theme.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  fare: { fontSize: 20, fontWeight: 800 },
  timeline: { gap: 2 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  point: { width: 12, height: 12, borderRadius: 6 },
  pointLabel: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase' },
  line: { height: 16, width: 2, backgroundColor: 'rgba(0,0,0,0.12)', marginLeft: 5 },
  locationBlock: { marginLeft: Spacing.four },
  location: { fontSize: 16, fontWeight: 600, lineHeight: 22 },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: Spacing.two, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14, fontWeight: 500 },
  rowValue: { fontSize: 14, fontWeight: 600, flexShrink: 1, textAlign: 'right', marginLeft: Spacing.three },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  customerName: { fontSize: 16, fontWeight: 700 },
  customerSub: { fontSize: 13, marginTop: 2 },
  callButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 12 },
  callText: { fontSize: 14, fontWeight: 700 },
  notes: { fontSize: 14, lineHeight: 20 },
  actions: { gap: Spacing.two },
  actionButton: { marginBottom: 0 },
  done: { fontSize: 15, fontWeight: 700, textAlign: 'center' },
});
