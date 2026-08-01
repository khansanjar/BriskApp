// src/app/(app)/(notifications)/index.tsx
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { getNotifications, markNotificationRead, type Notification as AppNotification } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

// OPTIMIZATION 1: Extracted and memoized NotificationCard component
type NotificationCardProps = {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  theme: ReturnType<typeof useTheme>;
};

const NotificationCard = memo(function NotificationCard({
  item,
  onPress,
  theme,
}: NotificationCardProps) {
  const { scale, verticalScale, moderateScale } = useResponsive();
  return (
    <Pressable onPress={() => onPress(item)}>
      <Card style={{ marginBottom: verticalScale(Spacing.two), opacity: item.is_read ? 0.6 : 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: moderateScale(16), fontWeight: '700', flexShrink: 1, color: theme.text }} numberOfLines={1}>{item.title}</Text>
          {!item.is_read ? <View style={{ width: scale(Spacing.half), height: scale(Spacing.half), borderRadius: moderateScale(4), marginLeft: scale(Spacing.two), backgroundColor: theme.brand }} /> : null}
        </View>
        <Text style={{ fontSize: moderateScale(14), marginTop: verticalScale(4), lineHeight: verticalScale(20), color: theme.textSecondary }} numberOfLines={2}>{item.body}</Text>
        <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(6), color: theme.textSecondary }}>
          {formatDateTime(item.created_at)}
        </Text>
      </Card>
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const theme = useTheme();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getNotifications({ page: 1, limit: 30 });
    setItems(res.notifications);
    return res;
  }, []);

  useEffect(() => {
    let active = true;
    setInitialLoading(true);
    setError(null);
    load()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load notifications.');
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (error) {
      console.error('[Notifications Refresh Error]:', error);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handlePress = useCallback(async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
      } catch (error) {
        console.warn('[Mark Notification Read Error]:', error);
      }
    }
    if (n.data?.booking_id) {
      router.push(`/(app)/(bookings)/booking/${n.data.booking_id}`);
    }
  }, []);

  // OPTIMIZATION 2: Stable renderItem returning memoized item component
  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationCard item={item} onPress={handlePress} theme={theme} />
    ),
    [handlePress, theme]
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: scale(Spacing.four), paddingBottom: verticalScale(Spacing.six + BottomTabInset + Spacing.three), flexGrow: items.length === 0 ? 1 : undefined, justifyContent: items.length === 0 ? 'center' : undefined }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      initialNumToRender={8}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
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
            icon="notifications-outline"
            title="No notifications"
            description="You're all caught up."
          />
        )
      }
    />
  );
}
