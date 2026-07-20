// src/app/(app)/(bookings)/booking/heading-to-pickup/[id].tsx
import { useLocalSearchParams } from 'expo-router';

import { HeadingToPickupScreen } from '@/components/heading-to-pickup-screen';

export default function HeadingToPickupRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HeadingToPickupScreen bookingId={Number(id)} />;
}
