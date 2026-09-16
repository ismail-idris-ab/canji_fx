import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrencyRow } from '@/components/currency-row';
import { MarketToggle } from '@/components/market-toggle';
import { RateCard } from '@/components/rate-card';
import { createRateBook } from '@/domain/rate-book';
import type { Market } from '@/domain/types';
import { useRateData } from '@/hooks/use-rate-data';

/**
 * Rates screen.
 *
 * The first Quoted Currency holding a Rate in the selected Market is featured
 * as a full card, because the US dollar is what most Readers open the app
 * for. The rest are compact rows.
 */
export default function RatesScreen() {
  const [market, setMarket] = useState<Market>('official');
  const state = useRateData();

  // One instant for the whole render, so no two rows can disagree about what
  // time it is.
  const now = useMemo(() => new Date(), []);

  const data = state.status === 'ready' ? state.data : null;

  const book = useMemo(
    () => createRateBook(data?.rates ?? [], now),
    [data, now]
  );

  const currencies = data?.currencies ?? [];

  const featuredCode = currencies.find(
    (c) => book.latest(c.code, market) !== null
  )?.code;

  const featuredRate = featuredCode ? book.latest(featuredCode, market) : null;
  const featuredFreshness = featuredCode
    ? book.freshness(featuredCode, market)
    : null;

  const rest = currencies.filter((c) => c.code !== featuredCode);

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView
        contentContainerClassName="px-5 py-6 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={state.status === 'ready' && state.refreshing}
            onRefresh={() => {
              if (state.status !== 'loading') state.retry();
            }}
            tintColor="#F5B301"
            colors={['#F5B301']}
            progressBackgroundColor="#15151C"
          />
        }
      >
        <View className="flex-row items-start justify-between">
          <View className="gap-1">
            <Text className="text-3xl font-bold tracking-tight text-ink">
              Canji
            </Text>
            <Text className="text-sm text-muted">
              Naira exchange rates, with their age
            </Text>
          </View>

          <Link href="/about" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About Canji"
              className="rounded-full border border-line bg-surface px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-xs font-semibold text-muted">About</Text>
            </Pressable>
          </Link>
        </View>

        <MarketToggle value={market} onChange={setMarket} />

        {state.status === 'loading' && <Loading />}

        {state.status === 'error' && (
          <ErrorState message={state.message} onRetry={state.retry} />
        )}

        {state.status === 'ready' && (
          <>
            {state.refreshError && <OfflineNotice onRetry={state.retry} />}

            {featuredRate && featuredFreshness && featuredCode ? (
              <RateCard
                rate={featuredRate}
                freshness={featuredFreshness}
                now={now}
                title={`${featuredCode} · ${
                  market === 'parallel' ? 'Parallel market' : 'Official market'
                }`}
              />
            ) : (
              <EmptyMarket market={market} />
            )}

            <View className="rounded-2xl border border-line bg-surface px-4 py-1">
              {rest.map((currency) => (
                <CurrencyRow
                  key={currency.code}
                  currency={currency}
                  market={market}
                  rate={book.latest(currency.code, market)}
                  freshness={book.freshness(currency.code, market)}
                />
              ))}
            </View>
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

/**
 * Shown when cached Rates are on screen because a refresh failed. The
 * Freshness badge already says how old each Rate is; this says why Canji has
 * not managed to look for a newer one.
 */
function OfflineNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-aging/30 bg-surface px-4 py-3">
      <View className="h-2 w-2 rounded-full bg-aging" />
      <Text className="flex-1 text-xs leading-4 text-muted">
        Showing saved rates. Canji could not reach the network to check for
        newer ones.
      </Text>
      <Pressable onPress={onRetry} className="active:opacity-70">
        <Text className="text-xs font-semibold text-accent">Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyMarket({ market }: { market: Market }) {
  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
      <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
        {market === 'parallel' ? 'Parallel market' : 'Official market'}
      </Text>
      <Text className="text-sm leading-5 text-muted">
        {market === 'parallel'
          ? 'No parallel rates recorded yet. Parallel rates come from market observation and are entered by hand.'
          : 'No official rates recorded yet.'}
      </Text>
    </View>
  );
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
