import { LineChart } from 'react-native-wagmi-charts';
import { Text, View } from 'react-native';

import { sharedDomain, type SeriesPoint } from '@/domain/history';

export const PARALLEL_COLOR = '#F5B301';
export const OFFICIAL_COLOR = '#8A8A99';

type Data = { timestamp: number; value: number }[];

function toData(series: readonly SeriesPoint[]): Data {
  return series
    .filter((point): point is { day: string; value: number } =>
      point.value !== null
    )
    .map((point) => ({
      // Days are Lagos or published trading days, anchored at midnight UTC
      // for plotting only. No time of day is implied or shown.
      timestamp: Date.parse(`${point.day}T00:00:00Z`),
      value: point.value,
    }));
}

/**
 * Two Markets on one pair of axes.
 *
 * Both lines are forced onto a single shared scale. The charting library
 * derives a scale per provider by default, which for a comparison is actively
 * misleading: a parallel line near ₦1,366 and an official one near ₦1,330
 * would each be stretched to fill the same height, so the distance between
 * them would show whatever the renderer chose rather than the real gap — and
 * the lines could even appear to cross. `yRange` overrides that.
 *
 * Absent days are already absent from each series. Nothing here fills them.
 */
export function ComparisonChart({
  parallel,
  official,
  height = 220,
}: {
  parallel: SeriesPoint[];
  official: SeriesPoint[];
  height?: number;
}) {
  const domain = sharedDomain([parallel, official]);
  const parallelData = toData(parallel);
  const officialData = toData(official);

  const drawable =
    domain !== null && (parallelData.length > 1 || officialData.length > 1);

  if (!drawable) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center rounded-2xl border border-line bg-surface p-5"
      >
        <Text className="text-center text-sm leading-5 text-muted">
          Not enough observations yet to compare the two markets. Canji plots
          only what it has actually seen.
        </Text>
      </View>
    );
  }

  const yRange = { min: domain.min, max: domain.max };

  return (
    <View className="gap-3">
      <View className="overflow-hidden rounded-2xl border border-line bg-surface">
        <LineChart.Group style={{ height }}>
          {officialData.length > 1 && (
            <LineChart.Provider data={officialData} yRange={yRange}>
              <LineChart height={height}>
                <LineChart.Path color={OFFICIAL_COLOR} width={2} />
              </LineChart>
            </LineChart.Provider>
          )}

          {parallelData.length > 1 && (
            <LineChart.Provider data={parallelData} yRange={yRange}>
              <LineChart height={height}>
                <LineChart.Path color={PARALLEL_COLOR} width={2} />
              </LineChart>
            </LineChart.Provider>
          )}
        </LineChart.Group>
      </View>

      <View className="flex-row gap-4">
        <Legend color={PARALLEL_COLOR} label="Parallel sell" />
        <Legend color={OFFICIAL_COLOR} label="Official central" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        style={{ backgroundColor: color }}
        className="h-0.5 w-5 rounded-full"
      />
      <Text className="text-[11px] text-muted">{label}</Text>
    </View>
  );
}
