// src/app/(app)/(profile)/earnings.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { getDriverEarningsReport, type EarningsPeriod, type EarningsResponse } from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function EarningsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();
  
  const [period, setPeriod] = useState<EarningsPeriod>('daily');
  const [date, setDate] = useState(getTodayDate());
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadEarnings = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const response = await getDriverEarningsReport(period, date, pageNum, 10);
      
      if (pageNum === 1) {
        setData(response);
        setPage(1);
      } else {
        setData(prev => prev ? {
          ...response,
          rides: [...prev.rides, ...response.rides],
        } : response);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load earnings data.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [period, date]);

  useFocusEffect(
    useCallback(() => {
      loadEarnings(1);
    }, [loadEarnings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEarnings(1);
    setRefreshing(false);
  }, [loadEarnings]);

  const handlePeriodChange = useCallback((newPeriod: EarningsPeriod) => {
    setPeriod(newPeriod);
    setPage(1);
  }, []);

  const loadMore = useCallback(() => {
    if (!data || loadingMore || page >= data.pagination.last_page) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadEarnings(nextPage);
  }, [data, loadingMore, page, loadEarnings]);

  const showBreakdown = period !== 'daily';

  return (
    <Screen scroll={false}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: insets.top + verticalScale(Spacing.three),
        paddingHorizontal: scale(Spacing.four),
        paddingBottom: verticalScale(Spacing.three),
        backgroundColor: theme.background,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: scale(Spacing.one) }}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: moderateScale(18), fontWeight: '700', color: theme.text }}>
          Earnings & Reports
        </Text>
        <View style={{ width: scale(32) }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: scale(Spacing.four), paddingBottom: verticalScale(Spacing.six) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Period Filter */}
        <View style={{
          flexDirection: 'row',
          borderRadius: moderateScale(14),
          padding: scale(Spacing.half),
          gap: scale(Spacing.half),
          backgroundColor: theme.backgroundElement,
          marginBottom: verticalScale(Spacing.three),
        }}>
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => handlePeriodChange(p.key)}
                style={{
                  flex: 1,
                  paddingVertical: verticalScale(Spacing.two),
                  borderRadius: moderateScale(10),
                  alignItems: 'center',
                  backgroundColor: active ? theme.brand : undefined,
                }}>
                <Text
                  style={{
                    color: active ? theme.brandText : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: moderateScale(13),
                  }}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && !data ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: verticalScale(Spacing.six) }}>
            <ActivityIndicator size="large" color={theme.brand} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: verticalScale(Spacing.six) }}>
            <EmptyState
              icon="alert-circle-outline"
              title="Error loading earnings"
              description={error}
              tone="danger"
              action={
                <Pressable onPress={onRefresh} style={{
                  paddingHorizontal: scale(Spacing.four),
                  paddingVertical: verticalScale(Spacing.two),
                  borderRadius: moderateScale(10),
                  backgroundColor: theme.brand,
                }}>
                  <Text style={{ color: theme.brandText, fontWeight: '700', fontSize: moderateScale(14) }}>
                    Retry
                  </Text>
                </Pressable>
              }
            />
          </View>
        ) : data ? (
          <>
            {/* Summary Card */}
            <Card style={{ marginBottom: verticalScale(Spacing.three) }}>
              <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>
                {period === 'daily' ? 'Today\'s' : period === 'weekly' ? 'This Week\'s' : 'This Month\'s'} Summary
              </Text>
              <View style={{
                flexDirection: isLandscape ? 'row' : 'column',
                gap: isLandscape ? scale(Spacing.four) : verticalScale(Spacing.three),
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: moderateScale(13), color: theme.textSecondary, marginBottom: verticalScale(Spacing.one) }}>
                    Total Earnings
                  </Text>
                  <Text style={{ fontSize: moderateScale(28), fontWeight: '800', color: theme.brand }}>
                    {formatCurrency(data.summary.total_earnings)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: moderateScale(13), color: theme.textSecondary, marginBottom: verticalScale(Spacing.one) }}>
                    Completed Rides
                  </Text>
                  <Text style={{ fontSize: moderateScale(28), fontWeight: '800', color: theme.text }}>
                    {data.summary.total_rides}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Daily Breakdown (for weekly/monthly) */}
            {showBreakdown && data.breakdown.length > 0 && (
              <Card style={{ marginBottom: verticalScale(Spacing.three) }}>
                <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>
                  Daily Breakdown
                </Text>
                {data.breakdown.map((item, index) => (
                  <View
                    key={item.date}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: verticalScale(Spacing.two),
                      borderBottomWidth: index < data.breakdown.length - 1 ? scale(1) : 0,
                      borderBottomColor: theme.border,
                    }}>
                    <View>
                      <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>
                        {formatDate(item.date)}
                      </Text>
                      <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>
                        {item.rides_count} ride{item.rides_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: theme.brand }}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Completed Rides List */}
            <Card style={{ marginBottom: verticalScale(Spacing.three) }}>
              <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>
                Completed Rides
              </Text>
              {data.rides.length === 0 ? (
                <EmptyState
                  icon="car-outline"
                  title="No rides yet"
                  description="No completed rides for this period"
                />
              ) : (
                <>
                  {data.rides.map((ride, index) => (
                    <View
                      key={ride.booking_id}
                      style={{
                        paddingVertical: verticalScale(Spacing.two),
                        borderBottomWidth: index < data.rides.length - 1 ? scale(1) : 0,
                        borderBottomColor: theme.border,
                      }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(Spacing.one) }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }} numberOfLines={1}>
                            {ride.order_id}
                          </Text>
                          <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
                            {ride.pickup_location}
                          </Text>
                        </View>
                        <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: theme.brand }}>
                          {formatCurrency(ride.total_fare)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>
                          {formatDate(ride.completed_at)} • {formatTime(ride.completed_at)}
                        </Text>
                        {ride.customer && (
                          <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>
                            {ride.customer.name}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {loadingMore && (
                    <View style={{ paddingVertical: verticalScale(Spacing.three), alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={theme.brand} />
                    </View>
                  )}
                  {page >= data.pagination.last_page && data.rides.length > 0 && (
                    <Text style={{ 
                      textAlign: 'center', 
                      fontSize: moderateScale(12), 
                      color: theme.textSecondary,
                      paddingVertical: verticalScale(Spacing.two),
                    }}>
                      End of list
                    </Text>
                  )}
                </>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}