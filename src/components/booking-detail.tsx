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
  const { scale, verticalScale, moderateScale } = useResponsive();
  const next = TRANSITIONS[booking.driver_status] ?? [];
  const missed = isRideMissed(booking);

  const isReturnTrip =
    booking.is_return_trip === 1 ||
    booking.is_return_trip === true ||
    (!!booking.return_date && booking.return_date.trim() !== '');

  const flightNo = booking.flightnumber ?? (booking as any).flight_number;
  const flightTime = booking.flight_time_24h ?? booking.flightTime;
  const showFlight = !!(flightNo && String(flightNo).trim() !== '');
  const flightValue =
    showFlight && flightTime
      ? `${flightNo} • ${flightTime}`
      : flightNo ?? '';

  const vehicleType = booking.vehicleType ?? booking.vehicle_type ?? '—';
  const extraComment = (booking.extracomment && booking.extracomment.trim() !== '')
    ? booking.extracomment
    : (booking.notes && booking.notes.trim() !== '')
      ? booking.notes
      : null;
  const showComments = extraComment !== null;

  const returnPickupLocation =
    (booking as any).return_pickup_location ?? booking.dropoff_location ?? '';
  const returnDestinationLocation =
    (booking as any).return_dropoff_location ??
    booking.return_location ??
    booking.pickup_location ??
    '';
  const returnDate = booking.return_date ?? '';
  const returnTime = booking.return_time ?? '';

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
      {/* Fare & Status Card */}
      <Card>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: verticalScale(Spacing.three),
        }}>
          <StatusBadge status={missed ? 'missed' : booking.driver_status} />
          <Text style={{ fontSize: moderateScale(18), fontWeight: '700', color: theme.text }}>
            {formatCurrency(booking.total_fare)}
          </Text>
        </View>

        {/* Address Route Timeline */}
        <View style={{ gap: verticalScale(Spacing.two) }}>
          {/* Pickup Point */}
          <View>
            <Point color={theme.brand} shape="dot" label="Pick up" />
            <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, marginTop: verticalScale(4) }}>
              {booking.pickup_location}
            </Text>
          </View>

          {/* Dropoff Point */}
          <View>
            <Point color={theme.success} shape="square" label="Drop off" />
            <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, marginTop: verticalScale(4) }}>
              {booking.dropoff_location}
            </Text>
          </View>

          {/* Return Trip (If Two-Way) */}
          {isReturnTrip ? (
            <View style={{ marginTop: verticalScale(Spacing.two), paddingTop: verticalScale(Spacing.two), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one), marginBottom: verticalScale(Spacing.two) }}>
                <Ionicons name="airplane-outline" size={scale(14)} color={theme.brand} />
                <Text style={{ fontSize: moderateScale(11), fontWeight: '700', textTransform: 'uppercase', color: theme.brand }}>
                  Return Trip {returnDate ? `• ${formatDate(returnDate)} ${returnTime ? formatTime(returnTime) : ''}` : ''}
                </Text>
              </View>

              <View style={{ gap: verticalScale(Spacing.two) }}>
                <View>
                  <Point color={theme.brand} shape="dot" label="Return Pickup" />
                  <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, marginTop: verticalScale(4) }}>
                    {returnPickupLocation}
                  </Text>
                </View>
                <View>
                  <Point color={theme.success} shape="square" label="Return Dropoff" />
                  <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, marginTop: verticalScale(4) }}>
                    {returnDestinationLocation}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Card>

      {/* Ride Info Rows Card */}
      <Card>
        <Row label="Date" value={formatDate(booking.pickup_date)} icon="calendar-outline" />
        <Row label="Time" value={formatTime(booking.pickup_time)} icon="time-outline" />
        <Row label="Vehicle" value={vehicleType} icon="car-outline" />
        <Row label="Order ID" value={booking.order_id} icon="receipt-outline" />
        {isReturnTrip ? (
          <Row label="Trip Type" value="Two-Way" icon="airplane-outline" />
        ) : null}
        {showFlight ? (
          <Row label="Flight" value={flightValue} icon="airplane-outline" />
        ) : null}
        {booking.started_at ? (
          <Row label="Started" value={formatDateTime(booking.started_at)} icon="play-circle-outline" />
        ) : null}
        {booking.completed_at ? (
          <Row label="Completed" value={formatDateTime(booking.completed_at)} icon="checkmark-circle-outline" />
        ) : null}
      </Card>

      {/* Customer Info Card */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.three) }}>
          <View style={{
            width: scale(40),
            height: scale(40),
            borderRadius: scale(20),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.brandSoft,
          }}>
            <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: theme.brand }}>
              {getInitials(
                booking.customer?.name?.split(' ')[0] ?? '',
                booking.customer?.name?.split(' ')[1] ?? ''
              )}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: moderateScale(15), fontWeight: '600', color: theme.text }} numberOfLines={1}>
              {booking.customer?.name ?? 'Customer'}
            </Text>
            {booking.customer?.phone ? (
              <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(2), color: theme.textSecondary }} numberOfLines={1}>
                {booking.customer.phone}
              </Text>
            ) : null}
            {booking.customer?.email ? (
              <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(2), color: theme.textSecondary }} numberOfLines={1}>
                {booking.customer.email}
              </Text>
            ) : null}
          </View>
          {booking.customer?.phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.customer!.phone}`)}
              style={{
                width: scale(36),
                height: scale(36),
                borderRadius: scale(18),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.brandSoft,
              }}>
              <Ionicons name="call" size={scale(18)} color={theme.brand} />
            </Pressable>
          ) : null}
        </View>
        {vehicleType !== '—' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one), marginTop: verticalScale(Spacing.two), paddingTop: verticalScale(Spacing.two), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
            <Ionicons name="car-outline" size={scale(14)} color={theme.textSecondary} />
            <Text style={{ fontSize: moderateScale(13), color: theme.textSecondary }}>{vehicleType}</Text>
          </View>
        ) : null}
      </Card>

      {/* Notes / Comments Card */}
      {showComments ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one), marginBottom: verticalScale(Spacing.one) }}>
            <Ionicons name="document-text-outline" size={moderateScale(14)} color={theme.textSecondary} />
            <Text style={{ fontSize: moderateScale(12), fontWeight: '700', textTransform: 'uppercase', color: theme.text }}>Notes / Comments</Text>
          </View>
          <Text style={{ fontSize: moderateScale(13), lineHeight: verticalScale(18), color: theme.textSecondary }}>{extraComment}</Text>
        </Card>
      ) : null}

      {/* Actions / Complete Banner */}
      {booking.driver_status === 'completed' ? (
        <Card>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '700', textAlign: 'center', color: theme.success }}>
            This ride is completed.
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
                    width: scale(40),
                    height: scale(40),
                    borderRadius: scale(20),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.dangerSoft,
                  }}>
                    <Ionicons name="alert-circle-outline" size={scale(24)} color={theme.danger} />
                  </View>
                  <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: theme.text }}>Cancel this ride?</Text>
                  <Text style={{ fontSize: moderateScale(13), lineHeight: verticalScale(18), textAlign: 'center', color: theme.textSecondary }}>
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
      <Text style={{ fontSize: moderateScale(11), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textSecondary }}>{label}</Text>
    </View>
  );
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one) }}>
        <Ionicons name={icon} size={scale(16)} color={theme.textSecondary} />
        <Text style={{ fontSize: moderateScale(14), fontWeight: '500', color: theme.textSecondary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: moderateScale(14), fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: scale(Spacing.three), color: theme.text }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
// Helper inline spacing function for clean avatar dimension calculation

function spacing(val: number) {
    return val * 4;
  }