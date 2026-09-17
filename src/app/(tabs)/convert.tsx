import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FreshnessBadge } from '@/components/freshness-badge';
import { MarketToggle } from '@/components/market-toggle';
import type { Direction } from '@/domain/conversion';
import { createRateBook } from '@/domain/rate-book';
import type { Market } from '@/domain/types';
import { useRateData } from '@/hooks/use-rate-data';
import { useNow } from '@/hooks/use-now';
import { formatNaira, formatObservedAt } from '@/lib/format';

/**
 * Converter.
 *
 * The result is what a Reader would actually get, not a flattering midpoint,
 * and the screen says which side of the Spread produced it so the arithmetic
 * can be checked. All of that lives in the Rate Book; this screen only asks.
 */
export default function ConvertScreen() {
  const [market, setMarket] = useState<Market>('parallel');
  const [direction, setDirection] = useState<Direction>('fromNaira');
  const [code, setCode] = useState('USD');
  const [input, setInput] = useState('');

  const state = useRateData();
  const now = useNow();

  const data = state.status === 'ready' ? state.data : null;
  const book = useMemo(() => createRateBook(data?.rates ?? [], now), [data, now]);

  const currencies = data?.currencies ?? [];
  const amount = Number(input.replace(/,/g, ''));
  const hasAmount = input.trim().length > 0 && Number.isFinite(amount);

  const rate = book.latest(code, market);
  const freshness = book.freshness(code, market);
  const result = hasAmount ? book.convert(code, market, amount, direction) : null;

  const fromLabel = direction === 'fromNaira' ? 'NGN' : code;
  const toLabel = direction === 'fromNaira' ? code : 'NGN';

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Convert
          </Text>
          <Text className="text-sm text-muted">
            At the rate that would actually apply
          </Text>
        </View>

        <MarketToggle value={market} onChange={setMarket} />

        <View className="flex-row flex-wrap gap-2">
          {currencies.map((currency) => {
            const selected = currency.code === code;
            return (
              <Pressable
                key={currency.code}
                onPress={() => setCode(currency.code)}
                className={`rounded-lg border px-3 py-1.5 active:opacity-70 ${
                  selected
                    ? 'border-accent/40 bg-raised'
                    : 'border-line bg-surface'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selected ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {currency.flagEmoji} {currency.code}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
          <View className="gap-1.5">
            <Text className="text-[11px] uppercase tracking-wider text-faint">
              You have ({fromLabel})
            </Text>
            <TextInput
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#5A5A68"
              className="rounded-xl bg-raised px-4 py-3 text-2xl font-semibold text-ink"
            />
          </View>

          <Pressable
            onPress={() =>
              setDirection((d) =>
                d === 'fromNaira' ? 'toNaira' : 'fromNaira'
              )
            }
            className="self-center rounded-full border border-line bg-raised px-4 py-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-accent">⇅ Swap</Text>
          </Pressable>

          <View className="gap-1.5">
            <Text className="text-[11px] uppercase tracking-wider text-faint">
              You get ({toLabel})
            </Text>
            <View className="rounded-xl bg-raised px-4 py-3">
              <Text className="text-2xl font-semibold text-ink">
                {result
                  ? direction === 'fromNaira'
                    ? `${result.result.toFixed(2)} ${code}`
                    : formatNaira(result.result, market)
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {rate && freshness ? (
          <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
                Rate applied
              </Text>
              <FreshnessBadge freshness={freshness} />
            </View>

            <Text className="text-sm text-ink">
              {result
                ? `${sideLabel(result.appliedSide)} · ${formatNaira(
                    result.appliedRate,
                    market
                  )} per ${code}`
                : `${formatNaira(
                    (market === 'official' ? rate.central : rate.sell) ?? 0,
                    market
                  )} per ${code}`}
            </Text>

            <View className="gap-1 border-t border-line pt-3">
              <Text className="text-xs text-muted">{rate.sourceLabel}</Text>
              <Text className="text-xs text-muted">
                Updated {formatObservedAt(rate.observedAt, now)}
              </Text>
            </View>
          </View>
        ) : (
          <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
            <Text className="text-sm leading-5 text-muted">
              No {market === 'parallel' ? 'parallel' : 'official'} rate has
              been recorded for {code}, so this conversion cannot be made.
            </Text>
          </View>
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
 * Names the side in the Reader's terms rather than the operator's, since
 * "Buy rate" on its own invites exactly the wrong reading.
 */
function sideLabel(side: 'buy' | 'sell' | 'central'): string {
  if (side === 'central') return 'Official central rate';
  return side === 'buy'
    ? 'Market buy rate — what they pay you'
    : 'Market sell rate — what they charge you';
}
