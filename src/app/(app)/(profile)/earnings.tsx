// src/app/(app)/(profile)/earnings.tsx
import DateTimePickerExpo from '@expo/ui/community/datetime-picker';
import Ionicons from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
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
    type EarningsData,
} from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

// HTML entity decoder function
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => entities[entity] || entity);
}

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
  const highestEarningDay = breakdown.reduce((max, item) => item.amount > max.amount ? item : max, breakdown[0]);
  const chartHeight = verticalScale(120);
  const barWidth = scale(12);
  const gap = scale(8);
  
  // Format date to short form (e.g., "1 Aug", "5 Aug")
  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  return (
    <View style={{ gap: verticalScale(Spacing.three) }}>
      {/* Bar Chart */}
      <View style={{ 
        height: chartHeight,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: scale(Spacing.one),
      }}>
        {breakdown.map((item) => {
          const barHeight = maxAmount > 0 ? (item.amount / maxAmount) * (chartHeight - verticalScale(20)) : 0;
          const isHighest = item.amount === highestEarningDay.amount && item.amount > 0;
          const hasEarnings = item.amount > 0;
          
          return (
            <View key={item.date} style={{ alignItems: 'center', gap: verticalScale(Spacing.one) }}>
              {/* Highest earning badge */}
              {isHighest && (
                <View style={{
                  backgroundColor: theme.brand,
                  paddingHorizontal: scale(Spacing.one),
                  paddingVertical: verticalScale(Spacing.half),
                  borderRadius: moderateScale(8),
                  marginBottom: verticalScale(Spacing.half),
                }}>
                  <Text style={{
                    fontSize: moderateScale(10),
                    fontWeight: '700',
                    color: theme.brandText,
                  }}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              )}
              
              {/* Bar */}
              <View style={{
                width: barWidth,
                height: Math.max(barHeight, verticalScale(4)),
                backgroundColor: hasEarnings ? theme.brand : theme.backgroundElement,
                borderRadius: moderateScale(6),
                borderTopLeftRadius: moderateScale(6),
                borderTopRightRadius: moderateScale(6),
                opacity: hasEarnings ? 1 : 0.3,
              }} />
              
              {/* Date Label */}
              <Text style={{
                fontSize: moderateScale(10),
                color: theme.textSecondary,
                textAlign: 'center',
              }}>
                {formatShortDate(item.date)}
              </Text>
            </View>
          );
        })}
      </View>
      
      {/* Legend */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: scale(Spacing.three),
        paddingTop: verticalScale(Spacing.one),
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one) }}>
          <View style={{ 
            width: scale(8), 
            height: scale(8), 
            borderRadius: moderateScale(4), 
            backgroundColor: theme.brand 
          }} />
          <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary }}>
            Earnings
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one) }}>
          <View style={{ 
            width: scale(8), 
            height: scale(8), 
            borderRadius: moderateScale(4), 
            backgroundColor: theme.backgroundElement,
            opacity: 0.3,
          }} />
          <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary }}>
            No earnings
          </Text>
        </View>
      </View>
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
  const decodedPickup = decodeHTMLEntities(ride.pickup_location);
  const decodedDropoff = decodeHTMLEntities(ride.dropoff_location);
  
  return (
    <Pressable
      onPress={() => router.push(`/(app)/(bookings)/booking/${ride.booking_id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={{
        marginBottom: verticalScale(Spacing.two),
        borderWidth: scale(1),
        borderColor: theme.border,
        borderRadius: moderateScale(16),
        backgroundColor: theme.surface,
        padding: scale(Spacing.three),
        gap: verticalScale(Spacing.three),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        {/* Header - Order ID, Vehicle Type, Fare */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: verticalScale(Spacing.one) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
              <Text style={{ fontSize: moderateScale(12), fontWeight: '600', color: theme.textSecondary }}>
                #{ride.order_id}
              </Text>
              {ride.vehicleType && (
                <View style={{
                  paddingHorizontal: scale(Spacing.two),
                  paddingVertical: verticalScale(Spacing.half),
                  borderRadius: moderateScale(6),
                  backgroundColor: theme.backgroundElement,
                }}>
                  <Text style={{ fontSize: moderateScale(10), fontWeight: '600', color: theme.text, textTransform: 'capitalize' }}>
                    {ride.vehicleType}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: moderateScale(18), fontWeight: '800', color: theme.success }}>
              {formatCurrency(ride.total_fare)}
            </Text>
            <View style={{
              paddingHorizontal: scale(Spacing.two),
              paddingVertical: verticalScale(Spacing.half),
              borderRadius: moderateScale(999),
              backgroundColor: theme.successSoft,
              marginTop: verticalScale(Spacing.half),
            }}>
              <Text style={{ fontSize: moderateScale(11), fontWeight: '700', color: theme.success, textTransform: 'capitalize' }}>
                {ride.driver_status}
              </Text>
            </View>
          </View>
        </View>

        {/* Route Timeline */}
        <View style={{ flexDirection: 'row', gap: scale(Spacing.three) }}>
          {/* Timeline Line */}
          <View style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: verticalScale(Spacing.one) }}>
            {/* Pickup Dot */}
            <View style={{
              width: scale(10),
              height: scale(10),
              borderRadius: moderateScale(5),
              backgroundColor: theme.success,
            }} />
            {/* Vertical Line */}
            <View style={{
              width: scale(2),
              height: verticalScale(24),
              backgroundColor: theme.border,
            }} />
            {/* Dropoff Marker */}
            <View style={{
              width: scale(10),
              height: scale(10),
              borderRadius: moderateScale(5),
              backgroundColor: theme.brand,
            }} />
          </View>

          {/* Locations */}
          <View style={{ flex: 1, gap: verticalScale(Spacing.three), justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary, marginBottom: verticalScale(Spacing.half) }}>
                Pickup
              </Text>
              <Text style={{ fontSize: moderateScale(13), fontWeight: '500', color: theme.text }} numberOfLines={2}>
                {decodedPickup}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary, marginBottom: verticalScale(Spacing.half) }}>
                Dropoff
              </Text>
              <Text style={{ fontSize: moderateScale(13), fontWeight: '500', color: theme.text }} numberOfLines={2}>
                {decodedDropoff}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer - Customer Info & Time */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: verticalScale(Spacing.two),
          borderTopWidth: scale(1),
          borderTopColor: theme.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
            <Ionicons name="person-outline" size={moderateScale(14)} color={theme.textSecondary} />
            <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
              {ride.customer_name}
            </Text>
            {ride.customer_phone && (
              <>
                <Ionicons name="call-outline" size={moderateScale(14)} color={theme.textSecondary} />
                <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
                  {ride.customer_phone}
                </Text>
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one) }}>
            <Ionicons name="time-outline" size={moderateScale(14)} color={theme.textSecondary} />
            <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>
              {formatDate(ride.pickup_date)} • {formatTime(ride.pickup_time)}
            </Text>
          </View>
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
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [response, setResponse] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
    }
  };

  const handleDateDismiss = () => {
    setShowDatePicker(false);
  };

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
            rides: {
              ...res.rides,
              items: [...prev.rides.items, ...res.rides.items],
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
    const lastPage = response?.rides.last_page ?? 1;
    if (page >= lastPage) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadEarnings(nextPage);
  }, [response, loadingMore, page, loadEarnings]);

  const earningsData = response;
  const totalAmount = earningsData?.summary?.total_amount ?? 0;
  const totalRides = earningsData?.summary?.total_rides ?? 0;
  const breakdownList = earningsData?.breakdown ?? [];
  const ridesList = earningsData?.rides?.items ?? [];
  const showBreakdown = period !== 'daily';

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: scale(Spacing.four), paddingBottom: verticalScale(Spacing.six) }}
          ListHeaderComponent={
            <>
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

                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
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
                  <Ionicons name="chevron-down-outline" size={scale(18)} color={theme.textSecondary} />
                </Pressable>
                {showDatePicker && (
                  <DateTimePickerExpo
                    value={selectedDate}
                    mode="date"
                    presentation="dialog"
                    onChange={handleDateChange}
                    onDismiss={handleDateDismiss}
                    display="default"
                    accentColor={theme.brand}
                  />
                )}
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
                  {/* Summary Cards */}
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
                </>
              ) : null}
            </>
          }
          data={ridesList}
          renderItem={({ item }) => (
            <RideItem
              ride={item}
              theme={theme}
              scale={scale}
              verticalScale={verticalScale}
              moderateScale={moderateScale}
            />
          )}
          keyExtractor={(item) => String(item.booking_id)}
          ListFooterComponent={
            showBreakdown && breakdownList.length > 0 ? (
              <Card style={{ marginBottom: verticalScale(Spacing.three), marginTop: verticalScale(Spacing.two) }}>
                <Text style={{ fontSize: moderateScale(15), fontWeight: '700', marginBottom: verticalScale(Spacing.three), color: theme.text }}>
                  {period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Daily'} Breakdown
                </Text>
                <BreakdownChart
                  breakdown={breakdownList}
                  theme={theme}
                  scale={scale}
                  verticalScale={verticalScale}
                  moderateScale={moderateScale}
                />
              </Card>
            ) : null
          }
          ListEmptyComponent={
            !loading && !error && response ? (
              <Card style={{ marginBottom: verticalScale(Spacing.three) }}>
                <EmptyState
                  icon="car-outline"
                  title="No rides yet"
                  description="No completed rides for this period"
                />
              </Card>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Screen>
  );
}
