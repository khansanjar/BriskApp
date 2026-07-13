// src/app/(app)/(bookings)/index.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { BookingCard } from '@/components/booking-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { getBookings, type Booking, type BookingsType } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

const TABS: { key: BookingsType; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
  { key: 'all', label: 'All' },
];

const PAGE_LIMIT = 10;

export default function BookingsListScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<BookingsType>('upcoming');
  const [items, setItems] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTab = useRef(tab);
  currentTab.current = tab;

  const load = useCallback(async (targetTab: BookingsType, targetPage: number, append: boolean) => {
    const res = await getBookings({ type: targetTab, page: targetPage, limit: PAGE_LIMIT });
    setLastPage(res.last_page);
    setItems((prev) => (append ? [...prev, ...res.bookings] : res.bookings));
    return res;
  }, []);

  useEffect(() => {
    let active = true;
    setInitialLoading(true);
    setError(null);
    load(tab, 1, false)
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load bookings.');
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await load(tab, 1, false);
    } catch {
      /* surface error via list */
    } finally {
      setRefreshing(false);
    }
  }, [tab, load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      await load(currentTab.current, next, true);
      setPage(next);
    } catch {
      /* ignore — user can refresh */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, lastPage, load]);

  const openBooking = (id: number) => router.push(`/(app)/(bookings)/booking/${id}`);

  const renderItem = ({ item }: { item: Booking }) => (
    <BookingCard booking={item} onPress={() => openBooking(item.booking_id)} />
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.brand : theme.surface,
                  borderColor: theme.border,
                },
              ]}>
              <Text style={{ color: active ? theme.brandText : theme.text, fontWeight: '700' }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => String(item.booking_id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          initialLoading ? <ActivityIndicator color={theme.brand} style={{ padding: Spacing.four }} /> : null
        }
        ListEmptyComponent={
          initialLoading ? null : error ? (
            <EmptyState icon="⚠️" title="Something went wrong" description={error} />
          ) : (
            <EmptyState icon="📋" title="No bookings here" description="Nothing in this category yet." />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.brand} style={{ padding: Spacing.three }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
});
