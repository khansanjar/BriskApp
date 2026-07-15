import type { Booking } from '@/lib/api';

type PickupFields = Pick<Booking, 'pickup_date' | 'pickup_time' | 'driver_status'>;

/**
 * Combine a pickup date ("2026-07-11") and pickup time ("08:30:00",
 * "08:30", "08:30:00.000000", "08:30:00Z", or a date that already embeds the
 * time) into a single local Date. Returns null when the result isn't a valid
 * date so callers can guard against bad input instead of crashing.
 */
function pickupDateTime(date: string, time: string): Date | null {
  const dateStr = (date ?? '').trim();
  const timeStr = (time ?? '').trim();
  if (!dateStr) return null;

  // If the date field already carries a time component (ISO datetime, possibly
  // with fractional seconds / timezone), parse it directly.
  if (/\d{1,2}:\d{2}/.test(dateStr)) {
    const dt = new Date(dateStr);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Combine "YYYY-MM-DD" + "HH:MM:SS" and let the engine parse it.
  const combined = `${dateStr}T${timeStr || '00:00'}`;
  const dt = new Date(combined);
  if (!Number.isNaN(dt.getTime())) return dt;

  // Lenient fallback: read the components manually (no strict anchors so
  // trailing fractional seconds / timezone suffixes don't break parsing).
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  const tm = /(\d{1,2}):(\d{2})(?::(\d{1,2}))?/.exec(timeStr);
  if (!dm) return null;
  const manual = new Date(
    Number(dm[1]),
    Number(dm[2]) - 1,
    Number(dm[3]),
    tm ? Number(tm[1]) : 0,
    tm ? Number(tm[2]) : 0,
    tm && tm[3] ? Number(tm[3]) : 0,
    0
  );
  return Number.isNaN(manual.getTime()) ? null : manual;
}

/**
 * Presentational rule layered on top of `driver_status`: a ride is "missed"
 * when its pickup time has already passed and the driver never completed it.
 * No status is sent to the API — this only drives read-only UI states.
 */
export function isRideMissed(booking: PickupFields): boolean {
  if (booking.driver_status === 'completed') return false;
  const at = pickupDateTime(booking.pickup_date, booking.pickup_time);
  if (!at) return false;
  return at.getTime() < Date.now();
}

/** True when the pickup day is still in the future (ride can't be started yet). */
export function isFutureRide(pickupDate: string): boolean {
  const d = new Date(pickupDate);
  if (Number.isNaN(d.getTime())) return false;
  const pickupDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return pickupDay.getTime() > today.getTime();
}
