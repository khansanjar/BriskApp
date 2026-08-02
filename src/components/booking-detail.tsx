import Ionicons from '@react-native-vector-icons/ionicons';
import { useState, type ComponentProps } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import type { Booking, DriverStatus } from '@/lib/api';
import { isRideMissed } from '@/lib/booking-status';
import { formatCurrency, formatDate, formatDateTime, formatTime, getInitials } from '@/lib/format';

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
  const { isLandscape, screenWidth, scale, verticalScale, moderateScale, wp, hp } = useResponsive();
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
    <View style={{ gap: verticalScale(Spacing.three) }}>
      <Card>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: verticalScale(Spacing.three),
        }}>
          <StatusBadge status={missed ? 'missed' : booking.driver_status} />
          <Text style={{ fontSize: moderateScale(20), fontWeight: '800', color: theme.text }}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>

        {booking.driver_status !== 'assigned' ? (
          <View style={{ gap: verticalScale(Spacing.half) }}>
            <Point color={theme.brand} shape="dot" label="Pick up" />
            <Line />
            <View style={[{ marginLeft: scale(Spacing.four), flex: 1, minWidth: 0 }]}>
              <Text style={{ fontSize: moderateScale(16), fontWeight: '600', lineHeight: verticalScale(22), color: theme.text, flexShrink: 1 }} numberOfLines={1}>
                {booking.pickup_location}
              </Text>
            </View>
            <View style={{ height: verticalScale(Spacing.six) }} />
            <Point color={theme.success} shape="square" label="Drop off" />
            <Line />
            <View style={[{ marginLeft: scale(Spacing.four), flex: 1, minWidth: 0 }]}>
              <Text style={{ fontSize: moderateScale(16), fontWeight: '600', lineHeight: verticalScale(22), color: theme.text, flexShrink: 1 }} numberOfLines={1}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.three) }}>
          <View style={{
            width: scale(Spacing.six + Spacing.four),
            height: scale(Spacing.six + Spacing.four),
            borderRadius: scale(Spacing.six + Spacing.four),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.brandSoft,
          }}>
            <Text style={{ fontSize: moderateScale(Spacing.three + Spacing.half), fontWeight: '800', color: theme.brand }}>
              {getInitials(
                booking.customer?.name?.split(' ')[0] ?? '',
                booking.customer?.name?.split(' ')[1] ?? ''
              )}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: theme.text }} numberOfLines={1}>
              {booking.customer?.name ?? 'Customer'}
            </Text>
            {booking.customer?.phone ? (
              <Text style={{ fontSize: moderateScale(13), marginTop: verticalScale(2), color: theme.textSecondary }} numberOfLines={1}>
                {booking.customer.phone}
              </Text>
            ) : null}
            {booking.customer?.email ? (
              <Text style={{ fontSize: moderateScale(13), marginTop: verticalScale(2), color: theme.textSecondary }} numberOfLines={1}>
                {booking.customer.email}
              </Text>
            ) : null}
          </View>
          {booking.customer?.phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.customer!.phone}`)}
              style={{
                width: scale(Spacing.four + Spacing.four),
                height: scale(Spacing.four + Spacing.four),
                borderRadius: scale(Spacing.three + Spacing.two - Spacing.half),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.brandSoft,
              }}>
              <Ionicons name="call" size={scale(Spacing.four + Spacing.four)} color={theme.brand} />
            </Pressable>
          ) : null}
        </View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: verticalScale(Spacing.three),
          paddingTop: verticalScale(Spacing.three),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
        }}>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.textSecondary }}>
            {booking.vehicle_type ?? 'Ride'}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: moderateScale(Spacing.three + Spacing.half), fontWeight: '800', color: theme.text, flexShrink: 1 }}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>
      </Card>

      {booking.notes ? (
        <Card>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '700', marginBottom: verticalScale(Spacing.two), textTransform: 'uppercase', color: theme.text }}>Notes</Text>
          <Text style={{ fontSize: moderateScale(14), lineHeight: verticalScale(20), color: theme.textSecondary, flexShrink: 1 }} numberOfLines={2}>{booking.notes}</Text>
        </Card>
      ) : null}

      {booking.driver_status === 'completed' ? (
        <Card>
          <Text style={{ fontSize: moderateScale(Spacing.three + Spacing.half), fontWeight: '700', textAlign: 'center', color: theme.success }}>
            This ride is completed. 🎉
          </Text>
        </Card>
      ) : (
        <View style={{ gap: verticalScale(Spacing.two) }}>
{next.map((item, index) => (
              <Button
                key={item.value}
                title={item.label}
                variant={index === 0 ? 'primary' : 'secondary'}
                loading={updating}
                onPress={() => handleStatusPress(item.value)}
                style={next.length > 1 ? { marginBottom: 0 } : null}
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
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{
                  alignItems: 'center',
                  gap: verticalScale(Spacing.two),
                  padding: scale(Spacing.four),
                  borderRadius: scale(Spacing.five),
                  width: '85%',
                  maxWidth: scale(400),
                  backgroundColor: theme.surface,
                }}>
                  <View style={{
                    width: scale(Spacing.six + Spacing.four),
                    height: scale(Spacing.six + Spacing.four),
                    borderRadius: scale(Spacing.six + Spacing.four),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: verticalScale(Spacing.one),
                    backgroundColor: theme.dangerSoft,
                  }}>
                    <Ionicons name="alert-circle-outline" size={scale(Spacing.six + Spacing.four)} color={theme.danger} />
                  </View>
                  <Text style={{ fontSize: moderateScale(18), fontWeight: '800', color: theme.text }}>Cancel this ride?</Text>
                  <Text style={{ fontSize: moderateScale(14), lineHeight: verticalScale(20), textAlign: 'center', color: theme.textSecondary }}>
                    This action cannot be undone. The customer will be notified.
                  </Text>
                  <TextField
                    label="Reason (optional)"
                    placeholder="Why are you cancelling?"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    containerStyle={{ marginTop: verticalScale(Spacing.two), width: '100%' }}
                  />
                  <View style={{ flexDirection: 'row', marginTop: verticalScale(Spacing.three), width: '100%', justifyContent: 'center' }}>
                    <Button
                      title="Keep ride"
                      variant="secondary"
                      onPress={handleCancelDismiss}
                      disabled={cancelling}
                    />
                    <View style={{ width: scale(Spacing.two) }} />
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
  const { scale, moderateScale } = useResponsive();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
      <View
        style={{
          width: scale(Spacing.three),
          height: scale(Spacing.three),
          borderRadius: scale(shape === 'square' ? Spacing.one : Spacing.half + Spacing.one),
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: moderateScale(Spacing.three), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textSecondary }}>{label}</Text>
    </View>
  );
}

function Line() {
  const { scale, verticalScale } = useResponsive();
  return <View style={{ height: verticalScale(Spacing.four), width: scale(Spacing.half), backgroundColor: 'rgba(0,0,0,0.12)', marginLeft: scale(Spacing.half + Spacing.one) }} />;
}

function Row({ label, value, icon }: { label: string; value: string; icon: IoniconName }) {
  const theme = useTheme();
  const { scale, moderateScale, verticalScale } = useResponsive();
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalScale(Spacing.two),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.half + Spacing.one) }}>
        <Ionicons name={icon} size={scale(Spacing.four)} color={theme.textSecondary} />
        <Text style={{ fontSize: moderateScale(Spacing.four), fontWeight: '500', color: theme.textSecondary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: moderateScale(Spacing.four), fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: scale(Spacing.three), color: theme.text }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}


