import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GapLine } from '@/components/gap-line';
import { RateCard } from '@/components/rate-card';
import { RateChart } from '@/components/rate-chart';
import {
  availableRanges,
  buildSeries,
  changeOver,
  earliestDay,
  RANGE_LABEL,
  type Range,
} from '@/domain/history';
import { createRateBook } from '@/domain/rate-book';
import { useHistory } from '@/hooks/use-history';
import { useNow } from '@/hooks/use-now';
import { useRateData } from '@/hooks/use-rate-data';
import { formatNaira, formatRateDate } from '@/lib/format';

/**
 * One Quoted Currency in full: its live Rate, the Gap, and its history.
 *
 * This slice shows the Official Market line only. The parallel series, the
 * Gap chart and range unlocking follow once this has proved the charting
 * library renders twenty-five years of real data under the New Architecture.
 */
export default function CurrencyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const currencyCode = (code ?? 'USD').toUpperCase();

  const router = useRouter();
  const now = useNow();
  const rateData = useRateData();
  const history = useHistory(currencyCode);

  const [range, setRange] = useState<Range>('90d');

  const data = rateData.status === 'ready' ? rateData.data : null;
  const book = useMemo(() => createRateBook(data?.rates ?? [], now), [data, now]);

  const currency = data?.currencies.find((c) => c.code === currencyCode);
  const rates = history.status === 'ready' ? history.rates : [];

  const today = useMemo(
    () => new Date(now.getTime() + 60 * 60_000).toISOString().slice(0, 10),
    [now]
  );

  // The official series anchors this slice's chart, so it decides which
  // ranges are honest to offer. That answer differs per currency: the CBN
  // began publishing AED in 2026 and USD in 2001.
  const officialDays = useMemo(
    () => rates.filter((rate) => rate.market === 'official'),
    [rates]
  );

  const ranges = useMemo(
    () => availableRanges(officialDays, today),
    [officialDays, today]
  );

  const effectiveRange = ranges.includes(range) ? range : (ranges.at(-1) ?? 'all');

  const series = useMemo(
    () => buildSeries(rates, 'official', effectiveRange, today),
    [rates, effectiveRange, today]
  );

  const change = changeOver(series);
  const earliest = earliestDay(officialDays);

  const liveRate = book.latest(currencyCode, 'official');
  const liveFreshness = book.freshness(currencyCode, 'official');
  const gap = book.gap(currencyCode);

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          className="self-start active:opacity-70"
        >
          <Text className="text-sm font-semibold text-accent">‹ Rates</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            {currency?.flagEmoji ? `${currency.flagEmoji} ` : ''}
            {currencyCode}
          </Text>
          <Text className="text-sm text-muted">
            {currency?.name ?? 'Quoted currency'} · Naira
          </Text>
        </View>

        {liveRate && liveFreshness && (
          <RateCard
            rate={liveRate}
            freshness={liveFreshness}
            now={now}
            title="Official market"
          />
        )}

        {gap && <GapLine gap={gap} code={currencyCode} />}

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
              Official market history
            </Text>
            {change && (
              <Text
                className={`text-xs font-semibold ${
                  change.absolute >= 0 ? 'text-aging' : 'text-fresh'
                }`}
              >
                {change.absolute >= 0 ? '+' : '−'}
                {Math.abs(change.fraction * 100).toFixed(1)}%
              </Text>
            )}
          </View>

          {ranges.length > 1 && (
            <View className="flex-row gap-1 rounded-xl border border-line bg-surface p-1">
              {ranges.map((option) => {
                const selected = option === effectiveRange;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setRange(option)}
                    className={`flex-1 rounded-lg py-2 active:opacity-70 ${
                      selected ? 'bg-raised' : ''
                    }`}
                  >
                    <Text
                      className={`text-center text-xs font-semibold ${
                        selected ? 'text-accent' : 'text-muted'
                      }`}
                    >
                      {RANGE_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {history.status === 'loading' && (
            <View className="items-center gap-3 rounded-2xl border border-line bg-surface p-8">
              <ActivityIndicator color="#F5B301" />
              <Text className="text-sm text-muted">Loading history…</Text>
            </View>
          )}

          {history.status === 'error' && (
            <View className="gap-3 rounded-2xl border border-stale/40 bg-surface p-5">
              <Text className="text-xs leading-5 text-muted">
                {history.message}
              </Text>
              <Pressable onPress={history.retry} className="active:opacity-70">
                <Text className="text-sm font-semibold text-accent">
                  Try again
                </Text>
              </Pressable>
            </View>
          )}

          {history.status === 'ready' && (
            <>
              <RateChart series={series} />

              {change && (
                <Text className="text-xs leading-5 text-muted">
                  {formatNaira(change.from.value ?? 0, 'official')} on{' '}
                  {formatRateDate(change.from.day)} →{' '}
                  {formatNaira(change.to.value ?? 0, 'official')} on{' '}
                  {formatRateDate(change.to.day)}
                </Text>
              )}

              {earliest && (
                <Text className="text-xs leading-5 text-faint">
                  Official rates published by the Central Bank of Nigeria since{' '}
                  {formatRateDate(earliest)}. Days the Bank did not publish are
                  left blank rather than filled in.
                </Text>
              )}
            </>
          )}
        </View>

        <Text className="text-xs leading-5 text-faint">
          Rates are indicative, sourced from market observation, and for
          information only. Canji does not set, offer, or guarantee any rate.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
