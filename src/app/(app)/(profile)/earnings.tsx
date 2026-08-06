// src/app/(app)/(profile)/earnings.tsx
import Ionicons from '@react-native-vector-icons/ionicons';
import DateTimePickerExpo from '@expo/ui/community/datetime-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import {
    getDriverEarningsReport,
    type ApiResponse,
    type EarningsData,
} from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

const PERIODS: { key: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function BreakdownChart({ breakdown, theme, scale, verticalScale, moderateScale }: {
  breakdown: { date: string; amount: number; rides_count: number }[];
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  verticalScale: (n: number) => number;
  moderateScale: (n: number) => number;
}) {
  if (breakdown.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: verticalScale(Spacing.four) }}>
        <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary }}>No data available for this period</Text>
      </View>
    );
  }
  const maxAmount = Math.max(...breakdown.map((b) => b.amount), 1);
  return (
    <View style={{ gap: verticalScale(Spacing.two) }}>
      {breakdown.map((item) => {
        const pct = Math.max((item.amount / maxAmount) * 100, 2);
        return (
          <View key={item.date} style={{ gap: verticalScale(Spacing.half) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                {formatDate(item.date)}
              </Text>
              <Text style={{ fontSize: moderateScale(12), fontWeight: '700', color: theme.text, marginLeft: scale(Spacing.two) }}>
                {item.rides_count} {item.rides_count === 1 ? 'ride' : 'rides'}
              </Text>
              <Text style={{ fontSize: moderateScale(13), fontWeight: '800', color: theme.brand, marginLeft: scale(Spacing.two) }}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
            <View style={{ height: verticalScale(10), borderRadius: moderateScale(5), backgroundColor: theme.backgroundElement, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: moderateScale(5), backgroundColor: theme.brand }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RideItem({ ride, theme, scale, verticalScale, moderateScale }: {
  ride: {
    booking_id: number;
    order_id: string;
    pickup_location: string;
    dropoff_location: string;
    pickup_date: string;
    pickup_time: string;
    vehicleType: string;
    total_fare: number;
    driver_status: string;
    customer_name: string;
    customer_phone: string;
  };
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  verticalScale: (n: number) => number;
  moderateScale: (n: number) => number;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/(app)/(bookings)/booking/${ride.booking_id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={{
        paddingVertical: verticalScale(Spacing.two),
        borderBottomWidth: scale(1),
        borderBottomColor: theme.border,
        gap: verticalScale(Spacing.one),
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: scale(Spacing.two) }}>
            <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }} numberOfLines={1}>
              {ride.pickup_location}
            </Text>
            <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
              to {ride.dropoff_location}
            </Text>
          </View>
          <Text style={{ fontSize: moderateScale(16), fontWeight: '800', color: theme.text }}>
            {formatCurrency(ride.total_fare)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: scale(Spacing.two) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.three) }}>
            <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>
              {formatDate(ride.pickup_date)} • {formatTime(ride.pickup_time)}
            </Text>
            {ride.vehicleType ? (
              <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, textTransform: 'capitalize' }}>
                {ride.vehicleType}
              </Text>
            ) : null}
          </View>
          <View style={{
            paddingHorizontal: scale(Spacing.two),
            paddingVertical: verticalScale(Spacing.half),
            borderRadius: moderateScale(999),
            backgroundColor: theme.successSoft,
          }}>
            <Text style={{ fontSize: moderateScale(11), fontWeight: '700', color: theme.success, textTransform: 'capitalize' }}>
              {ride.driver_status}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one) }}>
          <Ionicons name="person-outline" size={moderateScale(12)} color={theme.textSecondary} />
          <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
            {ride.customer_name} {ride.customer_phone ? `• ${ride.customer_phone}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function EarningsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, scale, verticalScale, moderateScale } = useResponsive();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [response, setResponse] = useState<ApiResponse<EarningsData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  const loadEarnings = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const res = await getDriverEarningsReport(period, dateString, pageNum, 10);

      if (pageNum === 1) {
        setResponse(res);
        setPage(1);
      } else {
        setResponse((prev) => {
          if (!prev) return res;
          return {
            ...res,
            data: {
              ...res.data,
              rides: {
                ...res.data.rides,
                items: [...prev.data.rides.items, ...res.data.rides.items],
              },
            },
          };
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load earnings data.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [period, dateString]);

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

  const handlePeriodChange = useCallback((newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(newPeriod);
  }, []);

  const loadMore = useCallback(() => {
    if (!response || loadingMore) return;
    const lastPage = response.data.rides.last_page;
    if (page >= lastPage) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadEarnings(nextPage);
  }, [response, loadingMore, page, loadEarnings]);

  const earningsData = response?.data;
  const totalAmount = earningsData?.summary?.total_amount ?? 0;
  const totalRides = earningsData?.summary?.total_rides ?? 0;
  const breakdownList = earningsData?.breakdown ?? [];
  const ridesList = earningsData?.rides?.items ?? [];
  const lastPage = earningsData?.rides?.last_page ?? 1;
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
        {/* Period Filter + Date Picker */}
        <View style={{ gap: verticalScale(Spacing.two), marginBottom: verticalScale(Spacing.three) }}>
          <View style={{
            flexDirection: 'row',
            borderRadius: moderateScale(14),
            padding: scale(Spacing.half),
            gap: scale(Spacing.half),
            backgroundColor: theme.backgroundElement,
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

          <View style={{
            borderRadius: moderateScale(14),
            padding: scale(Spacing.two),
            backgroundColor: theme.backgroundElement,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
              <Ionicons name="calendar-outline" size={scale(18)} color={theme.textSecondary} />
              <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>
                {formatDate(dateString)}
              </Text>
            </View>
            <DateTimePickerExpo
              value={selectedDate}
              mode="date"
              onChange={(_, date) => {
                if (date) setSelectedDate(date);
              }}
              display="default"
              accentColor={theme.brand}
            />
          </View>
        </View>

        {loading && !response ? (
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
        ) : response ? (
          <>
            {/* PART 1: Summary + Rides */}
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
                    {formatCurrency(totalAmount)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: moderateScale(13), color: theme.textSecondary, marginBottom: verticalScale(Spacing.one) }}>
                    Completed Rides
                  </Text>
                  <Text style={{ fontSize: moderateScale(28), fontWeight: '800', color: theme.text }}>
                    {totalRides}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Completed Rides List */}
            <Card style={{ marginBottom: verticalScale(Spacing.three) }}>
              <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>
                Completed Rides
              </Text>
              {ridesList.length === 0 ? (
                <EmptyState
                  icon="car-outline"
                  title="No rides yet"
                  description="No completed rides for this period"
                />
              ) : (
                <>
                  {ridesList.map((ride) => (
                    <RideItem
                      key={ride.booking_id}
                      ride={ride}
                      theme={theme}
                      scale={scale}
                      verticalScale={verticalScale}
                      moderateScale={moderateScale}
                    />
                  ))}
                  {loadingMore && (
                    <View style={{ paddingVertical: verticalScale(Spacing.three), alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={theme.brand} />
                    </View>
                  )}
                  {page >= lastPage && ridesList.length > 0 && (
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

            {/* PART 2: Breakdown Chart */}
            <Card style={{ marginBottom: verticalScale(Spacing.three) }}>
              <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>
                {period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Daily'} Breakdown
              </Text>
              {!showBreakdown ? (
                <View style={{ alignItems: 'center', paddingVertical: verticalScale(Spacing.four), gap: verticalScale(Spacing.two) }}>
                  <Ionicons name="calendar-outline" size={moderateScale(32)} color={theme.textSecondary} />
                  <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary, textAlign: 'center' }}>
                    Breakdown is not available for daily view. Select Weekly or Monthly to see the chart.
                  </Text>
                </View>
              ) : (
                <BreakdownChart
                  breakdown={breakdownList}
                  theme={theme}
                  scale={scale}
                  verticalScale={verticalScale}
                  moderateScale={moderateScale}
                />
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
