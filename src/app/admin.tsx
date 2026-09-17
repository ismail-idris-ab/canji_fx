import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  checkEntry,
  type Deviation,
  type EntryProblem,
} from '@/domain/rate-entry';
import { useAdmin } from '@/hooks/use-admin';
import { useAdminHealth } from '@/hooks/use-admin-health';
import { useRateData } from '@/hooks/use-rate-data';
import { useNow } from '@/hooks/use-now';
import { formatNaira, formatObservedAt } from '@/lib/format';
import { supabase } from '@/lib/supabase';

/**
 * Admin area. Reached only by long-pressing the logo on the Rates screen;
 * it never appears in the tab bar.
 *
 * Gating is by the is_admin flag read from the database, not by the fact of
 * being signed in. That flag lives in a table with no write policy, so the
 * app cannot grant it to itself.
 */
export default function AdminScreen() {
  const admin = useAdmin();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          className="self-start active:opacity-70"
        >
          <Text className="text-sm font-semibold text-accent">‹ Back</Text>
        </Pressable>

        {admin.status === 'checking' && (
          <View className="items-center gap-3 p-8">
            <ActivityIndicator color="#F5B301" />
          </View>
        )}

        {admin.status === 'signedOut' && (
          <SignInForm onSubmit={admin.signIn} error={admin.error} />
        )}

        {admin.status === 'notAdmin' && (
          <View className="gap-3 rounded-2xl border border-stale/40 bg-surface p-5">
            <Text className="text-sm font-semibold text-stale">
              Not an admin account
            </Text>
            <Text className="text-xs leading-5 text-muted">
              {admin.email} is signed in but does not hold the admin flag.
            </Text>
            <Pressable
              onPress={() => void admin.signOut()}
              className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-accent">Sign out</Text>
            </Pressable>
          </View>
        )}

        {admin.status === 'admin' && (
          <RateEntry
            userId={admin.userId}
            email={admin.email}
            onSignOut={admin.signOut}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SignInForm({
  onSubmit,
  error,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View className="gap-4">
      <Text className="text-3xl font-bold tracking-tight text-ink">
        Admin sign in
      </Text>

      <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text className="text-xs text-stale">{error}</Text>}

        <Pressable
          onPress={() => void onSubmit(email.trim(), password)}
          className="rounded-xl bg-accent px-4 py-3 active:opacity-70"
        >
          <Text className="text-center text-sm font-bold text-ground">
            Sign in
          </Text>
        </Pressable>
      </View>

      <Text className="text-xs leading-5 text-faint">
        Signing in as Admin ends this device&apos;s anonymous Reader session.
        They are separate identities.
      </Text>
    </View>
  );
}
function RateEntry({
  userId,
  email,
  onSignOut,
}: {
  userId: string;
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const state = useRateData();
  const router = useRouter();
  const health = useAdminHealth(userId);
  const now = useNow();

  const [inputs, setInputs] = useState<Record<string, Entry>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const data = state.status === 'ready' ? state.data : null;
  const book = useMemo(() => createRateBook(data?.rates ?? [], now), [data, now]);

  // Only Tracked Currencies are observed by hand. Four entries is a job that
  // gets done in a rate round; eleven is a chore that gets skipped, and
  // unrecorded Rates decay into Stale ones.
  const tracked = (data?.currencies ?? []).filter((c) => c.trackedParallel);

  function set(code: string, side: 'buy' | 'sell', value: string) {
    setInputs((current) => {
      const existing = current[code] ?? { buy: '', sell: '' };
      return { ...current, [code]: { ...existing, [side]: value } };
    });
    setMessage(null);
  }

  // A currency left entirely blank is skipped, not treated as an error: an
  // Admin may genuinely have observed only some of the four.
  const rows = tracked.map((currency) => {
    const entry = inputs[currency.code] ?? { buy: '', sell: '' };
    const touched = entry.buy.trim() !== '' || entry.sell.trim() !== '';
    const previous = book.latest(currency.code, 'parallel');

    return {
      currency,
      entry,
      touched,
      previous,
      check: checkEntry(entry.buy, entry.sell, previous),
    };
  });

  const touchedRows = rows.filter((row) => row.touched);
  const readyRows = touchedRows.filter((row) => row.check.ok);
  const blockedRows = touchedRows.filter((row) => !row.check.ok);
  const canSubmit = readyRows.length > 0 && blockedRows.length === 0 && !saving;

  const deviations = readyRows.flatMap((row) =>
    row.check.ok && row.check.deviation
      ? [{ code: row.currency.code, deviation: row.check.deviation }]
      : []
  );

  async function record() {
    setSaving(true);
    setMessage(null);

    // One round trip for the whole rate round.
    const { error } = await supabase.from('rates').insert(
      readyRows.map((row) => ({
        currency_code: row.currency.code,
        market: 'parallel' as const,
        buy: row.check.ok ? row.check.buy : 0,
        sell: row.check.ok ? row.check.sell : 0,
        source_label: 'Parallel market survey' as const,
        created_by: userId,
      }))
    );

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setInputs({});
    setMessage(
      `Recorded ${readyRows.length} observation${
        readyRows.length === 1 ? '' : 's'
      }.`
    );
  }

  function submit() {
    if (!canSubmit) return;
    if (deviations.length > 0) {
      confirmDeviations(deviations, () => void record());
      return;
    }
    void record();
  }

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-3xl font-bold tracking-tight text-ink">
          Record rates
        </Text>
        <Text className="text-sm text-muted">
          Parallel market · leave a currency blank to skip it
        </Text>
      </View>

      {rows.map(({ currency, entry, previous, check, touched }) => (
        <View
          key={currency.code}
          className="gap-3 rounded-2xl border border-line bg-surface p-5"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-ink">
              {currency.flagEmoji} {currency.code}
            </Text>
            <Text className="text-xs text-faint">
              {previous
                ? `now ${formatNaira(
                    previous.buy ?? 0,
                    'parallel'
                  )} / ${formatNaira(previous.sell ?? 0, 'parallel')} · ${formatObservedAt(
                    previous.observedAt,
                    now
                  )}`
                : 'never observed'}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                label="Buy"
                value={entry.buy}
                onChangeText={(value) => set(currency.code, 'buy', value)}
                keyboardType="decimal-pad"
                placeholder={previous?.buy ? String(previous.buy) : '0'}
              />
            </View>
            <View className="flex-1">
              <Field
                label="Sell"
                value={entry.sell}
                onChangeText={(value) => set(currency.code, 'sell', value)}
                keyboardType="decimal-pad"
                placeholder={previous?.sell ? String(previous.sell) : '0'}
              />
            </View>
          </View>

          {touched && !check.ok && (
            <Text className="text-xs leading-5 text-stale">
              {problemText(check.problem.kind)}
            </Text>
          )}

          {touched && check.ok && check.deviation && (
            <Text className="text-xs leading-5 text-aging">
              {(check.deviation.fraction * 100).toFixed(0)}% away from the last{' '}
              {check.deviation.side} rate. You will be asked to confirm.
            </Text>
          )}
        </View>
      ))}

      {message && (
        <Text
          className={`text-xs ${
            message.startsWith('Recorded') ? 'text-fresh' : 'text-stale'
          }`}
        >
          {message}
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        className={`rounded-xl px-4 py-3 active:opacity-70 ${
          canSubmit ? 'bg-accent' : 'bg-raised'
        }`}
      >
        <Text
          className={`text-center text-sm font-bold ${
            canSubmit ? 'text-ground' : 'text-faint'
          }`}
        >
          {saving
            ? 'Recording…'
            : readyRows.length > 0
              ? `Record ${readyRows.length} observation${
                  readyRows.length === 1 ? '' : 's'
                }`
              : 'Record observations'}
        </Text>
      </Pressable>

      <Text className="text-xs leading-5 text-faint">
        Recorded as &ldquo;Parallel market survey&rdquo; and attributed to you.
        Rates cannot be edited or deleted — correct a mistake by recording a
        new observation.
      </Text>

      <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
            System
          </Text>
          <Text className="text-[11px] text-faint">
            {health.tokenState === 'registered'
              ? 'alerts on'
              : health.tokenState === 'unavailable'
                ? 'alerts off'
                : '…'}
          </Text>
        </View>

        {health.events.length === 0 ? (
          <Text className="text-xs leading-5 text-muted">
            Nothing to report. Incidents with the rate pipeline appear here.
          </Text>
        ) : (
          health.events.slice(0, 5).map((event) => (
            <View key={event.id} className="gap-0.5">
              <Text className="text-xs font-semibold text-aging">
                {event.kind}
              </Text>
              <Text className="text-[11px] text-faint">
                {formatObservedAt(event.createdAt, now)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Pressable
        onPress={() => router.push('/admin-official')}
        className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
      >
        <Text className="text-sm font-semibold text-accent">
          Official rate by hand ›
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/admin-news')}
        className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
      >
        <Text className="text-sm font-semibold text-accent">Curate news ›</Text>
      </Pressable>

      <Pressable
        onPress={() => void onSignOut()}
        className="self-start active:opacity-70"
      >
        <Text className="text-xs font-semibold text-muted">
          Sign out ({email})
        </Text>
      </Pressable>
    </View>
  );
}

type Entry = { buy: string; sell: string };

function problemText(kind: EntryProblem['kind']): string {
  switch (kind) {
    case 'incomplete':
      return 'Both sides are needed. A parallel rate is always two-sided.';
    case 'notANumber':
      return 'That is not a number.';
    case 'nonPositive':
      return 'A rate must be greater than zero.';
    case 'invertedSpread':
      return 'Sell is below buy. That spread is inverted, which is almost always a slipped digit.';
  }
}

/**
 * One confirmation for the whole round, listing every figure that moved far
 * enough to be worth a second look. Under append-only storage these cannot be
 * undone once recorded, and the wording says so.
 */
function confirmDeviations(
  deviations: { code: string; deviation: Deviation }[],
  onConfirm: () => void
) {
  const lines = deviations
    .map(
      ({ code, deviation }) =>
        `${code}: ${formatNaira(deviation.previous, 'parallel')} → ${formatNaira(
          deviation.typed,
          'parallel'
        )} (${(deviation.fraction * 100).toFixed(0)}%)`
    )
    .join('\n');

  Alert.alert(
    deviations.length === 1 ? 'That is a big move' : 'Those are big moves',
    `${lines}\n\nThis cannot be undone once recorded.`,
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
