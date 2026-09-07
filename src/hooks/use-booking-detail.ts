// src/hooks/use-booking-detail.ts
import { useCallback, useEffect, useState } from 'react';

import {
    getBooking,
    updateBookingStatus,
    type Booking,
    type DriverStatus,
} from '@/lib/api';

export function useBookingDetail(id: number) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
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

  useEffect(() => {
    setBooking(null);
    setError(null);
  }, [id]);

  const update = useCallback(
    async (status: DriverStatus) => {
      setUpdating(true);
      setError(null);
      try {
        const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 1500));
        await Promise.all([
          updateBookingStatus(id, { status }),
          minDelay
        ]);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update status.');
      } finally {
        setUpdating(false);
      }
    },
    [id, load]
  );

  return { booking, loading, updating, error, reload: load, update };
}
