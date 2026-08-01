// src/app/(app)/(bookings)/index.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { BookingCard } from '@/components/booking-card';
import { EmptyState } from '@/components/ui/empty-state';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { getBookings, type Booking, type BookingsType } from '@/lib/api';

const TABS: { key: BookingsType; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
  { key: 'all', label: 'All' },
];

const PAGE_LIMIT = 10;

// Top-level component declaration: Prevents function re-creation on every render
function ListSeparator() {
  const { verticalScale } = useResponsive();
  return <View style={{ height: verticalScale(Spacing.three) }} />;
}

export default function BookingsListScreen() {
  const theme = useTheme();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) {
          setRefreshing(true);
          await load(tab, 1, false);
          setRefreshing(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [load, tab])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await load(tab, 1, false);
    } catch (error) {
      console.error('[Bookings Refresh Error]:', error);
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

  // OPTIMIZATION 1: Wrapped openBooking in useCallback so reference stays stable
  const openBooking = useCallback((id: number) => {
    router.push(`/(app)/(bookings)/booking/${id}`);
  }, []);

  // OPTIMIZATION 2: renderItem now has a truly stable dependency array
  const renderItem = useCallback(
    ({ item }: { item: Booking }) => (
      <BookingCard booking={item} onPress={() => openBooking(item.booking_id)} />
    ),
    [openBooking]
  );

  const displayItems = items;

  const content = (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: scale(Spacing.four), paddingBottom: verticalScale(Spacing.six + BottomTabInset + Spacing.three) }}
      data={displayItems}
      keyExtractor={(item) => String(item.booking_id)}
      renderItem={renderItem}
      ItemSeparatorComponent={ListSeparator}
      initialNumToRender={6}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        initialLoading ? <ActivityIndicator color={theme.brand} style={{ padding: scale(Spacing.four) }} /> : null
      }
      ListEmptyComponent={
        initialLoading ? null : error ? (
          <EmptyState
            icon="alert-circle-outline"
            tone="danger"
            title="Something went wrong"
            description={error}
          />
        ) : (
          <EmptyState
            icon="documents-outline"
            title="No bookings here"
            description="Nothing in this category yet."
          />
        )
      }
      ListFooterComponent={loadingMore ? (
        <ActivityIndicator color={theme.brand} style={{ padding: verticalScale(Spacing.three) }} />
      ) : null}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flexDirection: 'row',
          gap: scale(Spacing.two),
          paddingHorizontal: scale(Spacing.four),
          paddingTop: isLandscape ? verticalScale(Spacing.two) : verticalScale(Spacing.four),
          paddingBottom: isLandscape ? verticalScale(Spacing.two) : verticalScale(Spacing.three),
        }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: verticalScale(Spacing.three),
                  paddingHorizontal: scale(Spacing.three),
                  borderRadius: moderateScale(14),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? theme.brand : theme.surfaceSecondary,
                },
                pressed && !active ? { opacity: 0.7 } : null,
              ]}>
              <Text
                style={{
                  color: active ? theme.brandText : theme.textSecondary,
                  fontWeight: '700',
                  fontSize: moderateScale(14),
                }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLandscape ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: scale(Spacing.four), paddingBottom: verticalScale(Spacing.six + BottomTabInset + Spacing.three) }}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}