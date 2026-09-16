import { Text, View } from 'react-native';

import type { Freshness } from '@/domain/types';

/**
 * Freshness is the product. It is a judgement, not a duration, so it reads
 * as one word a Reader can act on without doing date arithmetic.
 */

const LABEL: Record<Freshness, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
};

const TONE: Record<Freshness, { dot: string; text: string; ring: string }> = {
  fresh: { dot: 'bg-fresh', text: 'text-fresh', ring: 'border-fresh/30' },
  aging: { dot: 'bg-aging', text: 'text-aging', ring: 'border-aging/30' },
  stale: { dot: 'bg-stale', text: 'text-stale', ring: 'border-stale/40' },
};

export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const tone = TONE[freshness];

  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${tone.ring}`}
    >
      <View className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      <Text className={`text-[11px] font-semibold tracking-wide ${tone.text}`}>
        {LABEL[freshness]}
      </Text>
    </View>
  );
}
