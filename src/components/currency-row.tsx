import { Pressable, Text, View } from 'react-native';

import type { Currency, Freshness, Market, Rate } from '@/domain/types';
import { formatNaira, formatObservedAt } from '@/lib/format';

const LABEL: Record<Freshness, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
};

const TONE: Record<Freshness, string> = {
  fresh: 'text-fresh',
  aging: 'text-aging',
  stale: 'text-stale',
};

const DOT: Record<Freshness, string> = {
  fresh: 'bg-fresh',
  aging: 'bg-aging',
  stale: 'bg-stale',
};

/**
 * A Rate row in the currency list.
 *
 * Every Rate carries its Source and its Observed At here, not only on the
 * featured card. CONTEXT.md states that a Rate is never displayed without its
 * Observed At, and that is the product's central claim rather than a
 * formatting preference — a compact row is still a displayed Rate.
 *
 * Freshness is given as a word as well as a colour. A dot alone asks a Reader
 * to learn a legend, and conveys nothing to anyone who cannot distinguish the
 * hues.
 *
 * Where a Rate is absent the row says which kind of absence it is. A currency
 * with no official counterpart never will have one, while a Tracked Currency
 * simply has not been observed yet. Rendering both as a blank would make a
 * permanent fact and a temporary one look identical.
 */
export function CurrencyRow({
  currency,
  market,
  rate,
  freshness,
  now,
  onPress,
}: {
  currency: Currency;
  market: Market;
  rate: Rate | null;
  freshness: Freshness | null;
  now: Date;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress ? `${currency.code} details and history` : undefined
      }
      className="gap-2 border-b border-line/60 px-1 py-3.5 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-xl">{currency.flagEmoji}</Text>

        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">
            {currency.code}
          </Text>
          <Text className="text-xs text-faint">{currency.name}</Text>
        </View>

        {rate && freshness ? (
          <View className="items-end">
            {market === 'parallel' ? (
              <>
                <Text className="text-base font-semibold text-ink">
                  {rate.sell === null ? '—' : formatNaira(rate.sell, market)}
                </Text>
                <Text className="text-[11px] text-faint">
                  buy {rate.buy === null ? '—' : formatNaira(rate.buy, market)}
                </Text>
              </>
            ) : (
              <>
                <Text className="text-base font-semibold text-ink">
                  {rate.central === null
                    ? '—'
                    : formatNaira(rate.central, market)}
                </Text>
                <Text className="text-[11px] text-faint">central</Text>
              </>
            )}
          </View>
        ) : (
          <Text className="max-w-[45%] text-right text-[11px] leading-4 text-faint">
            {market === 'official' && !currency.hasOfficial
              ? 'No official market rate'
              : 'Not yet observed'}
          </Text>
        )}
      </View>

      {rate && freshness && (
        <View className="flex-row items-center gap-2 pl-8">
          <View className={`h-1.5 w-1.5 rounded-full ${DOT[freshness]}`} />
          <Text className={`text-[11px] font-semibold ${TONE[freshness]}`}>
            {LABEL[freshness]}
          </Text>
          <Text className="flex-1 text-[11px] text-faint" numberOfLines={1}>
            {rate.sourceLabel} · {formatObservedAt(rate.observedAt, now)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
