// src/hooks/use-booking-detail.ts
import { useCallback, useEffect, useState } from 'react';

import {
  declineBooking,
  getBooking,
  updateBookingStatus,
  type Booking,
  type DriverStatus,
} from '@/lib/api';

export function useBookingDetail(id: number) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await getBooking(id);
      setBooking(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (status: DriverStatus) => {
      setUpdating(true);
      setError(null);
      try {
        await updateBookingStatus(id, { status });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update status.');
      } finally {
        setUpdating(false);
      }
    },
    [id, load]
  );

  const decline = useCallback(
    async (reason?: string) => {
      setDeclining(true);
      setError(null);
      try {
        await declineBooking(id, reason);
      } finally {
        setDeclining(false);
      }
    },
    [id]
  );

  return { booking, loading, updating, declining, error, reload: load, update, decline };
}
