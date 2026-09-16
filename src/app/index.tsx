import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RateCard } from '@/components/rate-card';
import { createRateBook } from '@/domain/rate-book';
import { useRates } from '@/hooks/use-rates';

/**
 * Rates screen.
 *
 * This slice covers USD only, and deliberately shows both paths: a real
 * Official Market Rate, and the Parallel Market's empty state, which is
 * genuinely empty because a Parallel Rate is an Admin's observation of the
 * street and none has been recorded yet.
 */
export default function RatesScreen() {
  const state = useRates();

  // One instant for the whole render, so two cards can never disagree about
  // what time it is.
  const now = useMemo(() => new Date(), []);

  const book = useMemo(
    () => createRateBook(state.status === 'ready' ? state.rates : [], now),
    [state, now]
  );

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Canji
          </Text>
          <Text className="text-sm text-muted">US Dollar · Naira</Text>
        </View>

        {state.status === 'loading' && <Loading />}

        {state.status === 'error' && (
          <ErrorState message={state.message} onRetry={state.retry} />
        )}

        {state.status === 'ready' && (
          <>
            <MarketSection
              title="Official market"
              rate={book.latest('USD', 'official')}
              freshness={book.freshness('USD', 'official')}
              now={now}
              emptyMessage="No official rate has been recorded yet."
            />

            <MarketSection
              title="Parallel market"
              rate={book.latest('USD', 'parallel')}
              freshness={book.freshness('USD', 'parallel')}
              now={now}
              emptyMessage="No parallel rate recorded yet. Parallel rates come from market observation and are entered by hand."
            />
          </>
        )}

        <Text className="text-xs leading-5 text-faint">
          Rates are indicative, sourced from market observation, and for
          information only. Canji does not set, offer, or guarantee any rate.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MarketSection({
  title,
  rate,
  freshness,
  now,
  emptyMessage,
}: {
  title: string;
  rate: ReturnType<ReturnType<typeof createRateBook>['latest']>;
  freshness: ReturnType<ReturnType<typeof createRateBook>['freshness']>;
  now: Date;
  emptyMessage: string;
}) {
  if (!rate || !freshness) {
    return (
      <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
        <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
          {title}
        </Text>
        <Text className="text-sm leading-5 text-muted">{emptyMessage}</Text>
      </View>
    );
  }

  return <RateCard rate={rate} freshness={freshness} now={now} title={title} />;
}

function Loading() {
  return (
    <View className="items-center gap-3 rounded-2xl border border-line bg-surface p-8">
      <ActivityIndicator color="#F5B301" />
      <Text className="text-sm text-muted">Fetching rates…</Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-stale/40 bg-surface p-5">
      <Text className="text-sm font-semibold text-stale">
        Could not load rates
      </Text>
      <Text className="text-xs leading-5 text-muted">{message}</Text>
      <Pressable
        onPress={onRetry}
        className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
      >
        <Text className="text-sm font-semibold text-accent">Try again</Text>
      </Pressable>
    </View>
  );
}
