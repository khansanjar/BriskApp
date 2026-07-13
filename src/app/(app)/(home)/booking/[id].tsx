// src/app/(app)/(home)/booking/[id].tsx
import { useLocalSearchParams } from 'expo-router';

import { BookingDetailScreen } from '@/components/booking-detail-screen';

export default function BookingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookingDetailScreen id={Number(id)} />;
}
