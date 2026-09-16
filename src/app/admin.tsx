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
import { checkEntry, type Deviation } from '@/domain/rate-entry';
import { useAdmin } from '@/hooks/use-admin';
import { useRateData } from '@/hooks/use-rate-data';
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
  const now = useMemo(() => new Date(), []);

  const [buy, setBuy] = useState('');
  const [sell, setSell] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const data = state.status === 'ready' ? state.data : null;
  const book = useMemo(() => createRateBook(data?.rates ?? [], now), [data, now]);

  const previous = book.latest('USD', 'parallel');
  const check = checkEntry(buy, sell, previous);

  async function record(buyValue: number, sellValue: number) {
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from('rates').insert({
      currency_code: 'USD',
      market: 'parallel',
      buy: buyValue,
      sell: sellValue,
      source_label: 'Parallel market survey',
      created_by: userId,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBuy('');
    setSell('');
    setMessage('Recorded.');
  }

  function submit() {
    if (!check.ok) return;

    if (check.deviation) {
      confirmDeviation(check.deviation, () =>
        void record(check.buy, check.sell)
      );
      return;
    }

    void record(check.buy, check.sell);
  }

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-3xl font-bold tracking-tight text-ink">
          Record rate
        </Text>
        <Text className="text-sm text-muted">USD · Parallel market</Text>
      </View>

      <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
        <Text className="text-[11px] uppercase tracking-wider text-faint">
          Currently live
        </Text>
        {previous ? (
          <>
            <Text className="text-base text-ink">
              Buy {formatNaira(previous.buy ?? 0, 'parallel')} · Sell{' '}
              {formatNaira(previous.sell ?? 0, 'parallel')}
            </Text>
            <Text className="text-xs text-muted">
              {formatObservedAt(previous.observedAt, now)}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-muted">
            No parallel rate recorded yet.
          </Text>
        )}
      </View>

      <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
        <Field
          label="Buy — what the market pays for a dollar"
          value={buy}
          onChangeText={setBuy}
          keyboardType="decimal-pad"
        />
        <Field
          label="Sell — what the market charges for a dollar"
          value={sell}
          onChangeText={setSell}
          keyboardType="decimal-pad"
        />

        {!check.ok && check.problem.kind === 'invertedSpread' && (
          <Text className="text-xs leading-5 text-stale">
            Sell is below buy. That spread is inverted, which is almost always
            a slipped digit.
          </Text>
        )}

        {check.ok && check.deviation && (
          <Text className="text-xs leading-5 text-aging">
            That is {(check.deviation.fraction * 100).toFixed(0)}% away from
            the last {check.deviation.side} rate. You will be asked to confirm.
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
            {saving ? 'Recording…' : 'Record observation'}
          </Text>
        </Pressable>
      </View>

      <Text className="text-xs leading-5 text-faint">
        Recorded as &ldquo;Parallel market survey&rdquo; and attributed to you.
        Rates cannot be edited or deleted — correct a mistake by recording a
        new observation.
      </Text>

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

function confirmDeviation(deviation: Deviation, onConfirm: () => void) {
  Alert.alert(
    'That is a big move',
    `The last ${deviation.side} rate was ${formatNaira(
      deviation.previous,
      'parallel'
    )}. You typed ${formatNaira(deviation.typed, 'parallel')} — a change of ${(
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
