import { Text, View } from 'react-native';

import type { Currency, Freshness, Market, Rate } from '@/domain/types';
import { formatNaira } from '@/lib/format';

const DOT: Record<Freshness, string> = {
  fresh: 'bg-fresh',
  aging: 'bg-aging',
  stale: 'bg-stale',
};

/**
 * A compact Rate row for the currency list.
 *
 * Where a Rate is absent the row says why rather than rendering a blank. The
 * two reasons are different and must not look alike: a currency with no
 * Official Market counterpart never will have one, while a Tracked Currency
 * with no Parallel Rate simply has not been observed yet.
 */
export function CurrencyRow({
  currency,
  market,
  rate,
  freshness,
}: {
  currency: Currency;
  market: Market;
  rate: Rate | null;
  freshness: Freshness | null;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-line/60 px-1 py-3.5">
      <Text className="text-xl">{currency.flagEmoji}</Text>

      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">
          {currency.code}
        </Text>
        <Text className="text-xs text-faint">{currency.name}</Text>
      </View>

      {rate && freshness ? (
        <View className="flex-row items-center gap-2.5">
          <View className="items-end">
            {market === 'parallel' ? (
              <>
                <Text className="text-base font-semibold text-ink">
                  {rate.sell === null ? '—' : formatNaira(rate.sell, market)}
                </Text>
                <Text className="text-[11px] text-faint">
                  buy{' '}
                  {rate.buy === null ? '—' : formatNaira(rate.buy, market)}
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
          <View className={`h-2 w-2 rounded-full ${DOT[freshness]}`} />
        </View>
      ) : (
        <Text className="max-w-[45%] text-right text-[11px] leading-4 text-faint">
          {market === 'official' && !currency.hasOfficial
            ? 'No official market rate'
            : 'Not yet observed'}
        </Text>
      )}
    </View>
  );
}
