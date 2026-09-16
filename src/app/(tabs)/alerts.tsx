import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketToggle } from '@/components/market-toggle';
import type { AlertDirection } from '@/domain/alert-engine';
import { createRateBook } from '@/domain/rate-book';
import type { Market } from '@/domain/types';
import {
  MAX_ACTIVE_ALERTS,
  useAlerts,
  type RateAlert,
} from '@/hooks/use-alerts';
import { useRateData } from '@/hooks/use-rate-data';
import { formatNaira } from '@/lib/format';

/**
 * Rate Alerts.
 *
 * An alert fires once, on the Crossing, then stops. That is stated on screen
 * rather than left to be discovered, because a Reader who expects repeated
 * notifications will read the silence as a bug.
 */
export default function AlertsScreen() {
  const alerts = useAlerts();
  const rateData = useRateData();
  const now = useMemo(() => new Date(), []);

  const [market, setMarket] = useState<Market>('parallel');
  const [code, setCode] = useState('USD');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [threshold, setThreshold] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = rateData.status === 'ready' ? rateData.data : null;
  const book = useMemo(() => createRateBook(data?.rates ?? [], now), [data, now]);

  // Only pairs that actually carry a Rate can be alerted on: an alert on a
  // pair with no Rate could never fire, so offering it would be a trap.
  const available = (data?.currencies ?? []).filter(
    (currency) => book.latest(currency.code, market) !== null
  );

  const current = book.latest(code, market);
  const currentValue =
    current === null
      ? null
      : market === 'parallel'
        ? current.sell
        : current.central;

  const activeCount =
    alerts.status === 'ready'
      ? alerts.alerts.filter((a) => a.active).length
      : 0;

  async function submit() {
    if (alerts.status !== 'ready') return;

    const value = Number(threshold.replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) {
      setProblem('Enter a threshold greater than zero.');
      return;
    }

    setBusy(true);
    setProblem(null);

    const outcome = await alerts.create({
      currencyCode: code,
      market,
      direction,
      threshold: value,
    });

    setBusy(false);

    if (!outcome.ok) {
      setProblem(outcome.reason);
      return;
    }

    setThreshold('');
  }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Alerts
          </Text>
          <Text className="text-sm text-muted">
            Be told when a rate crosses a number you choose
          </Text>
        </View>

        <View className="gap-4 rounded-2xl border border-line bg-surface p-5">
          <MarketToggle value={market} onChange={setMarket} />

          <View className="flex-row flex-wrap gap-2">
            {available.map((currency) => {
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

          {available.length === 0 && (
            <Text className="text-xs leading-5 text-muted">
              No rates have been recorded for this market yet, so there is
              nothing to watch.
            </Text>
          )}

          <View className="flex-row gap-2">
            {(['above', 'below'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setDirection(option)}
                className={`flex-1 rounded-lg py-2.5 active:opacity-70 ${
                  direction === option ? 'bg-raised' : 'bg-ground'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    direction === option ? 'text-accent' : 'text-muted'
                  }`}
                >
                  Goes {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-1.5">
            <Text className="text-[11px] uppercase tracking-wider text-faint">
              Threshold
              {currentValue !== null &&
                ` · now ${formatNaira(currentValue, market)}`}
            </Text>
            <TextInput
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="decimal-pad"
              placeholder={currentValue !== null ? String(currentValue) : '0'}
              placeholderTextColor="#5A5A68"
              className="rounded-xl bg-raised px-4 py-3 text-xl font-semibold text-ink"
            />
          </View>

          {problem && (
            <Text className="text-xs leading-5 text-stale">{problem}</Text>
          )}

          <Pressable
            onPress={() => void submit()}
            disabled={busy || available.length === 0}
            className={`rounded-xl px-4 py-3 active:opacity-70 ${
              busy || available.length === 0 ? 'bg-raised' : 'bg-accent'
            }`}
          >
            <Text
              className={`text-center text-sm font-bold ${
                busy || available.length === 0 ? 'text-faint' : 'text-ground'
              }`}
            >
              {busy ? 'Setting up…' : 'Create alert'}
            </Text>
          </Pressable>

          <Text className="text-xs leading-5 text-faint">
            Watches the {market === 'parallel' ? 'sell' : 'central'} rate —
            {market === 'parallel'
              ? ' what the market charges you'
              : ' the official midpoint'}
            . Fires once when the rate crosses your number, then stops.
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
            Your alerts
          </Text>
          <Text className="text-xs text-faint">
            {activeCount} of {MAX_ACTIVE_ALERTS} active
          </Text>
        </View>

        {alerts.status === 'loading' && (
          <View className="items-center p-6">
            <ActivityIndicator color="#F5B301" />
          </View>
        )}

        {alerts.status === 'error' && (
          <View className="gap-2 rounded-2xl border border-stale/40 bg-surface p-5">
            <Text className="text-xs leading-5 text-muted">
              {alerts.message}
            </Text>
            <Pressable onPress={alerts.retry} className="active:opacity-70">
              <Text className="text-sm font-semibold text-accent">
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {alerts.status === 'ready' && alerts.alerts.length === 0 && (
          <View className="rounded-2xl border border-line bg-surface p-5">
            <Text className="text-sm leading-5 text-muted">
              No alerts yet. Canji will notify you once when a rate crosses the
              number you set.
            </Text>
          </View>
        )}

        {alerts.status === 'ready' &&
          alerts.alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onDelete={() => void alerts.remove(alert.id)}
            />
          ))}

        <Text className="text-xs leading-5 text-faint">
          Alerts are tied to this device. Rates are indicative and for
          information only.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function AlertRow({
  alert,
  onDelete,
}: {
  alert: RateAlert;
  onDelete: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-ink">
          {alert.currencyCode} goes {alert.direction}{' '}
          {formatNaira(alert.threshold, alert.market)}
        </Text>
        <Text className="text-xs text-muted">
          {alert.market === 'parallel' ? 'Parallel' : 'Official'} ·{' '}
          {alert.watchedSide} rate
          {!alert.active && ' · already fired'}
        </Text>
      </View>

      {!alert.active && (
        <View className="rounded-full border border-faint/30 px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-faint">Done</Text>
        </View>
      )}

      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete alert"
        className="active:opacity-70"
      >
        <Text className="text-sm font-semibold text-stale">Delete</Text>
      </Pressable>
    </View>
  );
}
