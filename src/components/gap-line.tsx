import { Text, View } from 'react-native';

import type { Gap } from '@/domain/gap';
import { formatNaira } from '@/lib/format';

/**
 * States the convention it uses rather than leaving a Reader to infer it.
 * "Parallel sell vs official central" is the whole meaning of the number.
 *
 * This component is only rendered when the Rate Book returns a Gap. It never
 * renders a placeholder, because a suppressed Gap should be absent rather
 * than explained away — the suppression happens when the figure would
 * mislead, and drawing attention to it invites a Reader to reconstruct it.
 */
export function GapLine({ gap, code }: { gap: Gap; code: string }) {
  const percent = (gap.fraction * 100).toFixed(1);
  const above = gap.naira >= 0;

  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
      <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
        Gap between markets
      </Text>

      <View className="flex-row items-baseline gap-2">
        <Text className="text-2xl font-semibold text-ink">
          {above ? '+' : '−'}
          {formatNaira(Math.abs(gap.naira), 'official').slice(1)}
        </Text>
        <Text className="text-base text-muted">
          ({above ? '+' : '−'}
          {Math.abs(Number(percent))}%)
        </Text>
      </View>

      <Text className="text-xs leading-5 text-muted">
        The street {above ? 'asks more than' : 'asks less than'} the official
        rate for {code}. Parallel sell {formatNaira(gap.parallelSell, 'parallel')}{' '}
        vs official central {formatNaira(gap.officialCentral, 'official')}.
      </Text>
    </View>
  );
}
