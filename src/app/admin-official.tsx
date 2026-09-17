import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createRateBook } from '@/domain/rate-book';
import {
  checkOfficialEntry,
  type Deviation,
  type OfficialEntryProblem,
} from '@/domain/rate-entry';
import { useAdmin } from '@/hooks/use-admin';
import { useRateData } from '@/hooks/use-rate-data';
import { formatNaira, formatRateDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

/**
 * Manual Official Market entry — the break-glass path.
 *
 * The scheduled fetch handles this normally. This screen exists for the case
 * the fetch cannot: the upstream endpoint reshaped, went dark, or the
 * fallback provider is serving a central rate with no spread.
 *
 * Rates recorded here carry the manual-entry Source label, so a Reader can
 * tell a hand-transcribed figure from an automatically fetched one. That
 * distinction matters because the two have different chances of being wrong.
 */
export default function AdminOfficialScreen() {
  const admin = useAdmin();
  const router = useRouter();
  const state = useRateData();
  const now = useMemo(() => new Date(), []);

  const [code, setCode] = useState('USD');
  const [buy, setBuy] = useState('');
  const [central, setCentral] = useState('');
  const [sell, setSell] = useState('');
  const [rateDate, setRateDate] = useState(todayInLagos());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const data = state.status === 'ready' ? state.data : null;
  const book = useMemo(() => createRateBook(data?.rates ?? [], now), [data, now]);

  const official = (data?.currencies ?? []).filter((c) => c.hasOfficial);
  const previous = book.latest(code, 'official');
  const check = checkOfficialEntry(buy, central, sell, rateDate, previous);

  async function record() {
    if (!check.ok || admin.status !== 'admin') return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from('rates').insert({
      currency_code: code,
      market: 'official',
      buy: check.buy,
      central: check.central,
      sell: check.sell,
      rate_date: check.rateDate,
      source_label: 'Central Bank of Nigeria (manual entry)',
      created_by: admin.userId,
    });

    setSaving(false);

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'A rate for that currency and date is already recorded.'
          : error.message
      );
      return;
    }

    setBuy('');
    setCentral('');
    setSell('');
    setMessage('Recorded.');
  }

  function submit() {
    if (!check.ok) return;

    if (check.deviation) {
      confirmDeviation(check.deviation, () => void record());
      return;
    }

    void record();
  }

  if (admin.status !== 'admin') {
    return (
      <SafeAreaView className="flex-1 bg-ground">
        <View className="gap-4 p-5">
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm font-semibold text-accent">‹ Back</Text>
          </Pressable>
          <Text className="text-sm text-muted">
            Sign in as an admin from the rate entry screen first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <Pressable onPress={() => router.back()} className="self-start active:opacity-70">
          <Text className="text-sm font-semibold text-accent">‹ Back</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Official rate by hand
          </Text>
          <Text className="text-sm text-muted">
            Only needed when the automatic fetch cannot run
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {official.map((currency) => {
            const selected = currency.code === code;
            return (
              <Pressable
                key={currency.code}
                onPress={() => setCode(currency.code)}
                className={`rounded-lg border px-3 py-1.5 active:opacity-70 ${
                  selected ? 'border-accent/40 bg-raised' : 'border-line bg-surface'
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

        <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-[11px] uppercase tracking-wider text-faint">
            Currently live
          </Text>
          {previous ? (
            <>
              <Text className="text-base text-ink">
                {formatNaira(previous.central ?? 0, 'official')} central
              </Text>
              <Text className="text-xs text-muted">
                {previous.sourceLabel}
                {previous.rateDate
                  ? ` · rate for ${formatRateDate(previous.rateDate)}`
                  : ''}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-muted">
              No official rate recorded for {code}.
            </Text>
          )}
        </View>

        <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
          <Field label="Rate date (YYYY-MM-DD)" value={rateDate} onChangeText={setRateDate} />
          <Field label="Buy" value={buy} onChangeText={setBuy} keyboardType="decimal-pad" />
          <Field label="Central" value={central} onChangeText={setCentral} keyboardType="decimal-pad" />
          <Field label="Sell" value={sell} onChangeText={setSell} keyboardType="decimal-pad" />

          {!check.ok && (buy || central || sell) && (
            <Text className="text-xs leading-5 text-stale">
              {problemText(check.problem.kind)}
            </Text>
          )}

          {check.ok && check.deviation && (
            <Text className="text-xs leading-5 text-aging">
              {(check.deviation.fraction * 100).toFixed(0)}% away from the last
              central rate. You will be asked to confirm.
            </Text>
          )}

          {message && (
            <Text
              className={`text-xs ${
                message === 'Recorded.' ? 'text-fresh' : 'text-stale'
              }`}
            >
              {message}
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={!check.ok || saving}
            className={`rounded-xl px-4 py-3 active:opacity-70 ${
              check.ok && !saving ? 'bg-accent' : 'bg-raised'
            }`}
          >
            <Text
              className={`text-center text-sm font-bold ${
                check.ok && !saving ? 'text-ground' : 'text-faint'
              }`}
            >
              {saving ? 'Recording…' : 'Record official rate'}
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs leading-5 text-faint">
          Recorded as &ldquo;Central Bank of Nigeria (manual entry)&rdquo; so
          Readers can tell it from an automatically fetched figure. Transcribe
          the CBN&apos;s published numbers exactly — their terms do not permit
          amending them.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function todayInLagos(): string {
  return new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10);
}

function problemText(kind: OfficialEntryProblem['kind']): string {
  switch (kind) {
    case 'incomplete':
      return 'All three figures and the rate date are needed.';
    case 'notANumber':
      return 'One of those is not a number.';
    case 'nonPositive':
      return 'A rate must be greater than zero.';
    case 'outOfOrder':
      return 'The CBN publishes buy below central below sell. Check the figures are in the right boxes.';
    case 'badRateDate':
      return 'Use a calendar date in YYYY-MM-DD form.';
  }
}

function confirmDeviation(deviation: Deviation, onConfirm: () => void) {
  Alert.alert(
    'That is a big move',
    `The last central rate was ${formatNaira(deviation.previous, 'official')}. ` +
      `You typed ${formatNaira(deviation.typed, 'official')} — a change of ${(
        deviation.fraction * 100
      ).toFixed(0)}%.\n\nThis cannot be undone once recorded.`,
    [
      { text: 'Check again', style: 'cancel' },
      { text: 'Record it', style: 'destructive', onPress: onConfirm },
    ]
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] uppercase tracking-wider text-faint">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#5A5A68"
        className="rounded-xl bg-raised px-4 py-3 text-lg text-ink"
        {...props}
      />
    </View>
  );
}
