import { Text, View } from 'react-native';

import type { Freshness, Market, Rate } from '@/domain/types';
import { formatNaira, formatObservedAt, formatRateDate } from '@/lib/format';

import { FreshnessBadge } from './freshness-badge';

/**
 * A Rate is never shown without its Source and its Observed At. That rule is
 * the whole product, so it is enforced here in the only component that
 * renders a Rate rather than left to each screen to remember.
 */
export function RateCard({
  rate,
  freshness,
  now,
  title,
}: {
  rate: Rate;
  freshness: Freshness;
  now: Date;
  title: string;
}) {
  return (
    <View className="gap-4 rounded-2xl border border-line bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
          {title}
        </Text>
        <FreshnessBadge freshness={freshness} />
      </View>

      {rate.market === 'parallel' ? (
        <View className="flex-row gap-8">
          <Figure label="Buy" value={rate.buy} market={rate.market} />
          <Figure label="Sell" value={rate.sell} market={rate.market} />
        </View>
      ) : (
        <View className="gap-3">
          <Figure label="Central" value={rate.central} market={rate.market} big />
          <View className="flex-row gap-8">
            <Figure label="Buy" value={rate.buy} market={rate.market} />
            <Figure label="Sell" value={rate.sell} market={rate.market} />
          </View>
        </View>
      )}

      <View className="gap-1 border-t border-line pt-3">
        <Text className="text-xs text-muted">{rate.sourceLabel}</Text>
        <Text className="text-xs text-muted">
          Updated {formatObservedAt(rate.observedAt, now)}
          {rate.rateDate ? ` · Rate for ${formatRateDate(rate.rateDate)}` : ''}
        </Text>
      </View>
    </View>
  );
}

function Figure({
  label,
  value,
  market,
  big = false,
}: {
  label: string;
  value: number | null;
  market: Market;
  big?: boolean;
}) {
  return (
    <View className="gap-0.5">
      <Text className="text-[11px] uppercase tracking-wider text-faint">
        {label}
      </Text>
      <Text
        className={`${big ? 'text-3xl' : 'text-xl'} font-semibold text-ink`}
      >
        {value === null ? '—' : formatNaira(value, market)}
      </Text>
    </View>
  );
}
