import { Pressable, Text, View } from 'react-native';

import type { Market } from '@/domain/types';

const OPTIONS: { market: Market; label: string }[] = [
  { market: 'parallel', label: 'Parallel' },
  { market: 'official', label: 'Official' },
];

/**
 * Switches the whole list between Markets.
 *
 * The labels name markets, not institutions — "Official", never "CBN". The
 * publisher of Nigeria's official rate has changed twice since 2023, and the
 * publisher is stated on each Rate's Source instead. See ADR 0003.
 */
export function MarketToggle({
  value,
  onChange,
}: {
  value: Market;
  onChange: (market: Market) => void;
}) {
  return (
    <View className="flex-row gap-1 rounded-xl border border-line bg-surface p-1">
      {OPTIONS.map(({ market, label }) => {
        const selected = market === value;
        return (
          <Pressable
            key={market}
            onPress={() => onChange(market)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`flex-1 rounded-lg py-2.5 active:opacity-70 ${
              selected ? 'bg-raised' : ''
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                selected ? 'text-accent' : 'text-muted'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
