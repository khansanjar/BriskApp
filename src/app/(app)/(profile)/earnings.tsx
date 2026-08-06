// src/app/(app)/(profile)/earnings.tsx
import DateTimePickerExpo from '@expo/ui/community/datetime-picker';
import Ionicons from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import {
  getDriverEarningsReport,
  type EarningsData,
  type EarningsRide,
} from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

const PERIODS: { key: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function BreakdownLine({ item, maxRides, theme, scale, verticalScale, moderateScale, period }: {
  item: { date: string; amount: number; rides_count: number };
  maxRides: number;
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  verticalScale: (n: number) => number;
  moderateScale: (n: number) => number;
  period: 'daily' | 'weekly' | 'monthly';
}) {
  const [animatedWidth] = useState(() => new Animated.Value(0));
  const hasEarnings = item.rides_count > 0;
  const linePercentage = maxRides > 0 ? (item.rides_count / maxRides) * 100 : 0;
  const dynamicWidthPercent = Math.max(linePercentage, 10);

  useEffect(() => {
    animatedWidth.setValue(0);
    Animated.timing(animatedWidth, {
      toValue: dynamicWidthPercent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [period, dynamicWidthPercent, animatedWidth]);

  const dateObj = new Date(item.date);
  const dayName = Number.isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObj);
  const dateLabel = Number.isNaN(dateObj.getTime()) ? item.date : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateObj);

  const widthInterpolate = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(Spacing.three),
      paddingVertical: verticalScale(Spacing.two),
      borderBottomWidth: scale(1),
      borderBottomColor: theme.border,
      opacity: hasEarnings ? 1 : 0.5,
    }}>
      <View style={{ width: scale(90), flexShrink: 0 }}>
        <Text style={{ fontSize: moderateScale(13), fontWeight: '700', color: theme.text }} numberOfLines={1}>
          {dayName}
        </Text>
        <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary }} numberOfLines={1}>
          {dateLabel}
        </Text>
      </View>

      <View style={{ flex: 1, flexShrink: 1, minHeight: verticalScale(12) }}>
        <View style={{
          width: '100%',
          height: verticalScale(10),
          borderRadius: moderateScale(5),
          backgroundColor: theme.backgroundElement,
          overflow: 'hidden',
        }}>
          {hasEarnings ? (
            <Animated.View style={{
              width: widthInterpolate,
              height: '100%',
              borderRadius: moderateScale(5),
              backgroundColor: theme.brand,
            }} />
          ) : (
            <View style={{
              width: '100%',
              height: '100%',
              borderRadius: moderateScale(5),
              backgroundColor: theme.border,
              opacity: 0.3,
            }} />
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', width: scale(110), flexShrink: 0 }}>
        <Text style={{ fontSize: moderateScale(13), fontWeight: '700', color: theme.text }} numberOfLines={1}>
          {item.rides_count} {item.rides_count === 1 ? 'ride' : 'rides'}
        </Text>
        <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );
}

function BreakdownList({ breakdown, theme, scale, verticalScale, moderateScale, period }: {
  breakdown: { date: string; amount: number; rides_count: number }[];
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  verticalScale: (n: number) => number;
  moderateScale: (n: number) => number;
  period: 'daily' | 'weekly' | 'monthly';
}) {
  if (breakdown.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: verticalScale(Spacing.four) }}>
        <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary }}>No data available for this period</Text>
      </View>
    );
  }

  const maxRides = Math.max(...(breakdown.map((b) => b.rides_count) || []), 1);

  return (
    <View style={{ gap: verticalScale(Spacing.one) }}>
      {breakdown.map((item) => (
        <BreakdownLine
          key={item.date}
          item={item}
          maxRides={maxRides}
          theme={theme}
          scale={scale}
          verticalScale={verticalScale}
          moderateScale={moderateScale}
          period={period}
        />
      ))}
    </View>
  );
}

function RideItem({
  ride,
  theme,
  scale,
  verticalScale,
  moderateScale,
  onPress,
}: {
  ride: EarningsRide;
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  verticalScale: (n: number) => number;
  moderateScale: (n: number) => number;
  onPress: () => void;
}) {
  const decodedPickup = decodeHTMLEntities(ride.pickup_location);
  const decodedDropoff = decodeHTMLEntities(ride.dropoff_location);

  return (
    <Pressable
      onPress={onPress}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: scale(Spacing.two) }}>
          <View style={{ flex: 1, gap: verticalScale(Spacing.one), flexShrink: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two), flexShrink: 1 }}>
              <Text style={{ fontSize: moderateScale(12), fontWeight: '600', color: theme.textSecondary, flexShrink: 1 }} numberOfLines={1}>
                #{ride.order_id}
              </Text>
              {ride.vehicleType && (
                <View style={{
                  paddingHorizontal: scale(Spacing.two),
                  paddingVertical: verticalScale(Spacing.half),
                  borderRadius: moderateScale(6),
                  backgroundColor: theme.backgroundElement,
                }}>
                  <Text style={{ fontSize: moderateScale(10), fontWeight: '600', color: theme.text, textTransform: 'capitalize' }} numberOfLines={1}>
                    {ride.vehicleType}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
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

        <View style={{ flexDirection: 'row', gap: scale(Spacing.three), alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: verticalScale(Spacing.one), width: scale(16) }}>
            <View style={{
              width: scale(10),
              height: scale(10),
              borderRadius: moderateScale(5),
              backgroundColor: theme.success,
            }} />
            <View style={{
              width: scale(2),
              height: verticalScale(24),
              backgroundColor: theme.border,
            }} />
            <View style={{
              width: scale(10),
              height: scale(10),
              borderRadius: moderateScale(5),
              backgroundColor: theme.brand,
            }} />
          </View>

          <View style={{ flex: 1, gap: verticalScale(Spacing.three), flexShrink: 1 }}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary, marginBottom: verticalScale(Spacing.half) }}>
                Pickup
              </Text>
              <Text style={{ fontSize: moderateScale(13), fontWeight: '500', color: theme.text, flexShrink: 1 }} numberOfLines={2}>
                {decodedPickup}
              </Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: moderateScale(11), color: theme.textSecondary, marginBottom: verticalScale(Spacing.half) }}>
                Dropoff
              </Text>
              <Text style={{ fontSize: moderateScale(13), fontWeight: '500', color: theme.text, flexShrink: 1 }} numberOfLines={2}>
                {decodedDropoff}
              </Text>
            </View>
          </View>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: verticalScale(Spacing.two),
          borderTopWidth: scale(1),
          borderTopColor: theme.border,
          gap: scale(Spacing.two),
          flexWrap: 'wrap',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two), flexShrink: 1 }}>
            <Ionicons name="person-outline" size={moderateScale(14)} color={theme.textSecondary} />
            <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, flexShrink: 1 }} numberOfLines={1}>
              {ride.customer_name}
            </Text>
            {ride.customer_phone && (
              <>
                <Ionicons name="call-outline" size={moderateScale(14)} color={theme.textSecondary} />
                <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, flexShrink: 1 }} numberOfLines={1}>
                  {ride.customer_phone}
                </Text>
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.one), flexShrink: 0 }}>
            <Ionicons name="time-outline" size={moderateScale(14)} color={theme.textSecondary} />
            <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }} numberOfLines={1}>
              {formatDate(ride.pickup_date)} • {formatTime(ride.pickup_time)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function RideDetailModal({ ride, visible, onClose, theme, scale, verticalScale, moderateScale }: {
  ride: EarningsRide | null;
  visible: boolean;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
  scale: (n: number) => number;
  verticalScale: (n: number) => number;
  moderateScale: (n: number) => number;
}) {
  if (!ride) return null;

  const decodedPickup = decodeHTMLEntities(ride.pickup_location);
  const decodedDropoff = decodeHTMLEntities(ride.dropoff_location);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}>
        <View style={{
          width: '100%',
          marginHorizontal: scale(16),
          maxHeight: '85%',
          backgroundColor: theme.background,
          borderRadius: moderateScale(16),
          overflow: 'hidden',
        }}>
          <SafeAreaView style={{ backgroundColor: theme.background }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: verticalScale(Spacing.two),
              paddingHorizontal: scale(Spacing.four),
              paddingBottom: verticalScale(Spacing.two),
              backgroundColor: theme.background,
            }}>
              <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: theme.text, flexShrink: 1 }} numberOfLines={1}>
                #{ride.order_id}
              </Text>
              <View style={{
                paddingHorizontal: scale(Spacing.two),
                paddingVertical: verticalScale(Spacing.half),
                borderRadius: moderateScale(999),
                backgroundColor: theme.successSoft,
              }}>
                <Text style={{ fontSize: moderateScale(12), fontWeight: '700', color: theme.success, textTransform: 'capitalize' }}>
                  {ride.driver_status}
                </Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: scale(Spacing.four), gap: verticalScale(Spacing.two), paddingBottom: verticalScale(Spacing.four) }}>
              <Card style={{ gap: verticalScale(Spacing.three) }}>
                <View>
                  <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, marginBottom: verticalScale(Spacing.half), textTransform: 'uppercase', letterSpacing: scale(1) }}>
                    Pickup
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(Spacing.two) }}>
                    <View style={{
                      width: scale(10),
                      height: scale(10),
                      borderRadius: moderateScale(5),
                      backgroundColor: theme.success,
                      marginTop: verticalScale(Spacing.one),
                    }} />
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, flexShrink: 1 }}>{decodedPickup}</Text>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, marginBottom: verticalScale(Spacing.half), textTransform: 'uppercase', letterSpacing: scale(1) }}>
                    Dropoff
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(Spacing.two) }}>
                    <View style={{
                      width: scale(10),
                      height: scale(10),
                      borderRadius: moderateScale(5),
                      backgroundColor: theme.brand,
                      marginTop: verticalScale(Spacing.one),
                    }} />
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text, flexShrink: 1 }}>{decodedDropoff}</Text>
                  </View>
                </View>
              </Card>

              <Card style={{ gap: verticalScale(Spacing.three) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
                  <Ionicons name="person-outline" size={moderateScale(18)} color={theme.textSecondary} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>Customer</Text>
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>{ride.customer_name}</Text>
                  </View>
                </View>

                {ride.customer_phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
                    <Ionicons name="call-outline" size={moderateScale(18)} color={theme.textSecondary} />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>Phone</Text>
                      <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>{ride.customer_phone}</Text>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
                  <Ionicons name="calendar-outline" size={moderateScale(18)} color={theme.textSecondary} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>Pickup Date</Text>
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>{formatDate(ride.pickup_date)}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(Spacing.two) }}>
                  <Ionicons name="time-outline" size={moderateScale(18)} color={theme.textSecondary} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary }}>Pickup Time</Text>
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>{formatTime(ride.pickup_time)}</Text>
                  </View>
                </View>
              </Card>

              <Card style={{ gap: verticalScale(Spacing.two) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: moderateScale(14), color: theme.textSecondary }}>Total Fare</Text>
                  <Text style={{ fontSize: moderateScale(18), fontWeight: '800', color: theme.success }}>{formatCurrency(ride.total_fare)}</Text>
                </View>
              </Card>

              <Pressable
                onPress={onClose}
                style={{
                  paddingVertical: verticalScale(Spacing.three),
                  borderRadius: moderateScale(14),
                  backgroundColor: theme.brand,
                  alignItems: 'center',
                  marginTop: verticalScale(Spacing.two),
                }}>
                <Text style={{ color: theme.brandText, fontWeight: '700', fontSize: moderateScale(16) }}>Close</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

export default function EarningsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { scale, verticalScale, moderateScale } = useResponsive();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [response, setResponse] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedRide, setSelectedRide] = useState<EarningsRide | null>(null);
  const [hideEarnings, setHideEarnings] = useState(true);

  const toggleHideEarnings = useCallback(() => {
    setHideEarnings((prev) => !prev);
  }, []);

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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
            <Ionicons name="arrow-back" size={moderateScale(24)} color={theme.text} />
          </Pressable>
          <Text style={{ fontSize: moderateScale(18), fontWeight: '700', color: theme.text }}>
            Earnings & Reports
          </Text>
          <View style={{ width: scale(32) }} />
        </View>

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: scale(Spacing.four), paddingBottom: verticalScale(Spacing.six + BottomTabInset + Spacing.three) }}
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <>
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
                    <Ionicons name="calendar-outline" size={moderateScale(18)} color={theme.textSecondary} />
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: theme.text }}>
                      {formatDate(dateString)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down-outline" size={moderateScale(18)} color={theme.textSecondary} />
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
                  <Card style={{ marginBottom: verticalScale(Spacing.three), gap: verticalScale(Spacing.two), position: 'relative' }}>
                    <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: theme.text }}>
                      {period === 'daily' ? "Today's" : period === 'weekly' ? "This Week's" : "This Month's"} Summary
                    </Text>
                    <Pressable onPress={toggleHideEarnings} hitSlop={8} style={{ position: 'absolute', top: verticalScale(Spacing.one), right: scale(Spacing.one), zIndex: 1 }}>
                      <Ionicons name={hideEarnings ? 'eye-off-outline' : 'eye-outline'} size={moderateScale(20)} color={theme.textSecondary} />
                    </Pressable>
                    <View style={{
                      flexDirection: 'row',
                      gap: scale(Spacing.three),
                    }}>
                      <View style={{
                        flex: 1,
                        backgroundColor: theme.brandSoft,
                        borderRadius: moderateScale(12),
                        padding: scale(Spacing.three),
                        alignItems: 'center',
                        gap: verticalScale(Spacing.one),
                      }}>
                        <View style={{
                          width: scale(36),
                          height: scale(36),
                          borderRadius: moderateScale(18),
                          backgroundColor: theme.brand,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: verticalScale(Spacing.half),
                        }}>
                          <Ionicons name="cash-outline" size={moderateScale(20)} color={theme.brandText} />
                        </View>
                        <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: scale(0.5) }}>
                          Total Earnings
                        </Text>
                        <Text style={{ fontSize: moderateScale(20), fontWeight: '800', color: theme.brand }} numberOfLines={1}>
                          {hideEarnings ? '******' : formatCurrency(totalAmount)}
                        </Text>
                      </View>

                      <View style={{
                        flex: 1,
                        backgroundColor: theme.successSoft,
                        borderRadius: moderateScale(12),
                        padding: scale(Spacing.three),
                        alignItems: 'center',
                        gap: verticalScale(Spacing.one),
                      }}>
                        <View style={{
                          width: scale(36),
                          height: scale(36),
                          borderRadius: moderateScale(18),
                          backgroundColor: theme.success,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: verticalScale(Spacing.half),
                        }}>
                          <Ionicons name="car-outline" size={moderateScale(20)} color="#FFFFFF" />
                        </View>
                        <Text style={{ fontSize: moderateScale(12), color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: scale(0.5) }}>
                          Completed Rides
                        </Text>
                        <Text style={{ fontSize: moderateScale(20), fontWeight: '800', color: theme.text }} numberOfLines={1}>
                          {hideEarnings ? '**' : totalRides}
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
              onPress={() => setSelectedRide(item)}
            />
          )}
          keyExtractor={(item) => String(item.booking_id)}
          ListFooterComponent={
            showBreakdown && breakdownList.length > 0 ? (
              <Card style={{ marginBottom: verticalScale(Spacing.three), marginTop: verticalScale(Spacing.two), gap: verticalScale(Spacing.two) }}>
                <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: theme.text }}>
                  {period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Daily'} Breakdown
                </Text>
                <BreakdownList
                  breakdown={breakdownList}
                  theme={theme}
                  scale={scale}
                  verticalScale={verticalScale}
                  moderateScale={moderateScale}
                  period={period}
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

        <RideDetailModal
          ride={selectedRide}
          visible={selectedRide !== null}
          onClose={() => setSelectedRide(null)}
          theme={theme}
          scale={scale}
          verticalScale={verticalScale}
          moderateScale={moderateScale}
        />
      </View>
  );
}
