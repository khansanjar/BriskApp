// src/app/(app)/(notifications)/index.tsx
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { getNotifications, markNotificationRead, type Notification as AppNotification } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

export default function NotificationsScreen() {
  const theme = useTheme();
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
    } catch {
      /* surface via list */
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handlePress = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
      } catch {
        /* non-fatal */
      }
    }
    if (n.data?.booking_id) {
      router.push(`/(app)/(bookings)/booking/${n.data.booking_id}`);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <Pressable onPress={() => handlePress(item)}>
      <Card style={[styles.card, { opacity: item.is_read ? 0.6 : 1 }]}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
          {!item.is_read ? <View style={[styles.dot, { backgroundColor: theme.brand }]} /> : null}
        </View>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{item.body}</Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {formatDateTime(item.created_at)}
        </Text>
      </Card>
    </Pressable>
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
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

const styles = StyleSheet.create({
  list: { padding: Spacing.four, paddingBottom: Spacing.six },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 700, flexShrink: 1 },
  body: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: Spacing.two },
});
