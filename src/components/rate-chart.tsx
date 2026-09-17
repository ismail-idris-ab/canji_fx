import { LineChart } from 'react-native-wagmi-charts';
import { Text, View } from 'react-native';

import type { SeriesPoint } from '@/domain/history';

/**
 * A single line of Rates over time.
 *
 * Deliberately plain for now: this component is the gate that proves the
 * charting library and the New Architecture work with real data — twenty-five
 * years of it — before the interesting work depends on them.
 *
 * Days without an observation are already absent from the series. Nothing
 * here fills them in.
 */
export function RateChart({
  series,
  height = 220,
  color = '#F5B301',
}: {
  series: SeriesPoint[];
  height?: number;
  color?: string;
}) {
  // Two points is the minimum that draws a line rather than a dot.
  if (series.length < 2) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center rounded-2xl border border-line bg-surface p-5"
      >
        <Text className="text-center text-sm leading-5 text-muted">
          Not enough observations yet to draw a line. Aboki Rate plots what it has
          actually seen, so this fills in as rates are recorded.
        </Text>
      </View>
    );
  }

  const data = series
    .filter((point): point is { day: string; value: number } =>
      point.value !== null
    )
    .map((point) => ({
      // The library wants epoch milliseconds. Days are Lagos or published
      // trading days, so they are anchored at midnight UTC for plotting only
      // — no time of day is implied or shown.
      timestamp: Date.parse(`${point.day}T00:00:00Z`),
      value: point.value,
    }));

  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      <LineChart.Provider data={data}>
        <LineChart height={height} width={undefined}>
          <LineChart.Path color={color} width={2} />
        </LineChart>
      </LineChart.Provider>
    </View>
  );
}
