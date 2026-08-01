import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, Modal } from 'react-native';
import { useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { type ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCurrency, formatDate, formatDateTime, formatTime, getInitials } from '@/lib/format';
import { isRideMissed } from '@/lib/booking-status';
import { useTheme } from '@/hooks/use-theme';
import type { Booking, DriverStatus } from '@/lib/api';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Exact state machine: assigned → heading_to_pickup → arrived → in_progress → completed.
// Only the immediate next state is offered, so no invalid transitions are possible.
const NEXT_LABEL: Record<DriverStatus, string | null> = {
  assigned: 'Head to pickup',
  heading_to_pickup: 'Mark arrived',
  arrived: 'Start trip',
  in_progress: 'Complete trip',
  completed: null,
  canceled: null,
};

const NEXT_STATE: Record<DriverStatus, DriverStatus | null> = {
  assigned: 'heading_to_pickup',
  heading_to_pickup: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
  completed: null,
  canceled: null,
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
  onCancel,
  cancelling,
}: {
  booking: Booking;
  onUpdate: (status: DriverStatus) => void;
  updating: boolean;
  onCancel: (reason?: string) => void;
  cancelling: boolean;
}) {
  const theme = useTheme();
  const { isLandscape, screenWidth, scale, verticalScale, wp, hp } = useResponsive();
  const next = TRANSITIONS[booking.driver_status] ?? [];
  const missed = isRideMissed(booking);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  function handleCancelPress() {
    setShowCancelConfirm(true);
  }

  function handleCancelConfirm() {
    setShowCancelConfirm(false);
    onCancel(cancelReason.trim() || undefined);
    setCancelReason('');
  }

  function handleCancelDismiss() {
    setShowCancelConfirm(false);
    setCancelReason('');
  }

  function handleStatusPress(status: DriverStatus) {
    if (status === 'heading_to_pickup') {
      Alert.alert(
        'Head to pickup?',
        'Are you sure you want to start heading towards the pickup location?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Head there', onPress: () => onUpdate(status) },
        ],
        { cancelable: true }
      );
      return;
    }
    onUpdate(status);
  }

  return (
    <View style={styles.container}>
      <Card>
        <View style={[styles.statusRow, isLandscape && styles.statusRowLandscape]}>
          <StatusBadge status={missed ? 'missed' : booking.driver_status} />
          <Text style={[styles.fare, { color: theme.text }]}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>

        {booking.driver_status !== 'assigned' ? (
          <View style={styles.timeline}>
            <Point color={theme.brand} shape="dot" label="Pick up" />
            <Line />
            <View style={styles.locationBlock}>
              <Text style={[styles.location, { color: theme.text }]}>
                {booking.pickup_location}
              </Text>
            </View>
            <View style={{ height: Spacing.six }} />
            <Point color={theme.success} shape="square" label="Drop off" />
            <Line />
            <View style={styles.locationBlock}>
              <Text style={[styles.location, { color: theme.text }]}>
                {booking.dropoff_location}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <Row label="Date" value={formatDate(booking.pickup_date)} icon="calendar-outline" />
        <Row label="Time" value={formatTime(booking.pickup_time)} icon="time-outline" />
        <Row label="Vehicle" value={booking.vehicle_type ?? '—'} icon="car-outline" />
        <Row label="Order ID" value={booking.order_id} icon="receipt-outline" />
        {booking.started_at ? (
          <Row label="Started" value={formatDateTime(booking.started_at)} icon="play-circle-outline" />
        ) : null}
        {booking.completed_at ? (
          <Row label="Completed" value={formatDateTime(booking.completed_at)} icon="checkmark-circle-outline" />
        ) : null}
      </Card>

      <Card>
        <View style={[styles.customerRow, isLandscape && styles.customerRowLandscape]}>
          <View style={[styles.customerAvatar, { backgroundColor: theme.brandSoft }]}>
            <Text style={[styles.customerInitials, { color: theme.brand }]}>
              {getInitials(
                booking.customer?.name?.split(' ')[0] ?? '',
                booking.customer?.name?.split(' ')[1] ?? ''
              )}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
              {booking.customer?.name ?? 'Customer'}
            </Text>
            {booking.customer?.phone ? (
              <Text style={[styles.customerSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {booking.customer.phone}
              </Text>
            ) : null}
            {booking.customer?.email ? (
              <Text style={[styles.customerSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {booking.customer.email}
              </Text>
            ) : null}
          </View>
          {booking.customer?.phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.customer!.phone}`)}
              style={[styles.callButton, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="call" size={20} color={theme.brand} />
            </Pressable>
          ) : null}
        </View>
        <View style={[styles.customerFareRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.customerFareLabel, { color: theme.textSecondary }]}>
            {booking.vehicle_type ?? 'Ride'}
          </Text>
          <Text numberOfLines={1} style={[styles.customerFare, { color: theme.text, flexShrink: 1 }]}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>
      </Card>

      {booking.notes ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.notes, { color: theme.textSecondary }]}>{booking.notes}</Text>
        </Card>
      ) : null}

      {booking.driver_status === 'completed' ? (
        <Card>
          <Text style={[styles.done, { color: theme.success }]}>
            This ride is completed. 🎉
          </Text>
        </Card>
      ) : (
        <View style={styles.actions}>
{next.map((item, index) => (
              <Button
                key={item.value}
                title={item.label}
                variant={index === 0 ? 'primary' : 'secondary'}
                loading={updating}
                onPress={() => handleStatusPress(item.value)}
                style={next.length > 1 ? styles.actionButton : null}
              />
            ))}

          {booking.driver_status === 'assigned' && !showCancelConfirm ? (
            <Button
              title="Cancel Ride"
              variant="destructive"
              loading={cancelling}
              disabled={updating || cancelling}
              onPress={handleCancelPress}
            />
          ) : null}

          {showCancelConfirm ? (
            <Modal visible={showCancelConfirm} animationType="fade" transparent>
              <View style={styles.modalOverlay}>
                <View style={[styles.cancelConfirmCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.cancelIcon, { backgroundColor: theme.dangerSoft }]}>
                    <Ionicons name="alert-circle-outline" size={26} color={theme.danger} />
                  </View>
                  <Text style={[styles.cancelConfirmTitle, { color: theme.text }]}>Cancel this ride?</Text>
                  <Text style={[styles.cancelConfirmText, { color: theme.textSecondary }]}>
                    This action cannot be undone. The customer will be notified.
                  </Text>
                  <TextField
                    label="Reason (optional)"
                    placeholder="Why are you cancelling?"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    containerStyle={styles.cancelReasonField}
                  />
                  <View style={styles.cancelConfirmActions}>
                    <Button
                      title="Keep ride"
                      variant="secondary"
                      onPress={handleCancelDismiss}
                      disabled={cancelling}
                    />
                    <View style={styles.cancelConfirmActionGap} />
                    <Button
                      title="Yes, cancel ride"
                      variant="destructive"
                      loading={cancelling}
                      disabled={updating || cancelling}
                      onPress={handleCancelConfirm}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Point({ color, shape, label }: { color: string; shape: 'dot' | 'square'; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.pointRow}>
      <View
        style={[
          styles.point,
          shape === 'square' ? styles.pointSquare : styles.pointDot,
          { backgroundColor: color },
        ]}
      />
      <Text style={[styles.pointLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Line() {
  return <View style={styles.line} />;
}

function Row({ label, value, icon }: { label: string; value: string; icon: IoniconName }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLabelWrap}>
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
        <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
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
  statusRowLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fare: { fontSize: 20, fontWeight: 800 },
  timeline: { gap: 2 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  point: { width: 12, height: 12 },
  pointDot: { width: 12, height: 12, borderRadius: 6 },
  pointSquare: { width: 12, height: 12, borderRadius: 4 },
  pointLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  rowLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 14, fontWeight: 500 },
  rowValue: { fontSize: 14, fontWeight: 600, flexShrink: 1, textAlign: 'right', marginLeft: Spacing.three },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  customerRowLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitials: { fontSize: 17, fontWeight: 800 },
  customerName: { fontSize: 16, fontWeight: 700 },
  customerSub: { fontSize: 13, marginTop: 2 },
  customerFareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  customerFareLabel: { fontSize: 14, fontWeight: 600 },
  customerFare: { fontSize: 18, fontWeight: 800 },
  callButton: { width: 44, height: 44, borderRadius: Spacing.three + Spacing.two - Spacing.half, alignItems: 'center', justifyContent: 'center' },
  callText: { fontSize: 14, fontWeight: 700 },
  notes: { fontSize: 14, lineHeight: 20 },
  actions: { gap: Spacing.two },
  actionButton: { marginBottom: 0 },
  done: { fontSize: 15, fontWeight: 700, textAlign: 'center' },
  cancelConfirmCard: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: 20, width: '85%', maxWidth: 400 },
  cancelIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  cancelConfirmTitle: { fontSize: 18, fontWeight: 800 },
  cancelConfirmText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  cancelReasonField: { marginTop: Spacing.two, width: '100%' },
  cancelConfirmActions: { flexDirection: 'row', marginTop: Spacing.three, width: '100%', justifyContent: 'center' },
  cancelConfirmActionGap: { width: Spacing.two },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
