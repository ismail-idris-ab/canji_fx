import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { checkSupabaseReachable } from '@/lib/supabase';

type CheckState =
  | { status: 'checking' }
  | { status: 'pass'; detail: string }
  | { status: 'fail'; detail: string };

/**
 * Scaffold smoke screen, kept as a diagnostic at /smoke.
 *
 * This exists to answer three questions before any product UI is written:
 * does NativeWind actually style components under the New Architecture, is
 * the New Architecture in fact enabled, and do the configured Supabase URL
 * and anon key work. It is replaced by the Rates screen in the next slice.
 */
export default function SmokeScreen() {
  const [supabaseCheck, setSupabaseCheck] = useState<CheckState>({
    status: 'checking',
  });
  const [anonCheck, setAnonCheck] = useState<CheckState>({
    status: 'checking',
  });

  useEffect(() => {
    let cancelled = false;

    checkSupabaseReachable().then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setSupabaseCheck({ status: 'fail', detail: result.reason });
        setAnonCheck({ status: 'fail', detail: 'Could not reach the project' });
        return;
      }

      setSupabaseCheck({ status: 'pass', detail: 'Auth settings readable' });
      setAnonCheck(
        result.anonymousSignInsEnabled
          ? { status: 'pass', detail: 'Enabled' }
          : {
              status: 'fail',
              detail:
                'Disabled — enable it under Authentication → Sign In / Providers',
            }
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // react-native-worklets is only installed under the New Architecture in
  // this configuration, and global.nativeFabricUIManager is the runtime
  // marker Fabric sets. Reading it is the only honest way to confirm.
  const fabricEnabled =
    typeof (globalThis as Record<string, unknown>).nativeFabricUIManager !==
    'undefined';

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-8 gap-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Canji
          </Text>
          <Text className="text-sm text-muted">Scaffold smoke test</Text>
        </View>

        <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
            NativeWind
          </Text>
          <Text className="text-base text-ink">
            This card is styled entirely with utility classes. Borders,
            spacing, radius and the palette below all come from
            tailwind.config.js.
          </Text>

          <View className="mt-2 flex-row flex-wrap gap-2">
            <Swatch label="accent" className="bg-accent" />
            <Swatch label="fresh" className="bg-fresh" />
            <Swatch label="aging" className="bg-aging" />
            <Swatch label="stale" className="bg-stale" />
          </View>
        </View>

        <CheckRow
          label="New Architecture (Fabric)"
          state={
            fabricEnabled
              ? { status: 'pass', detail: 'nativeFabricUIManager present' }
              : {
                  status: 'fail',
                  detail:
                    'Fabric marker absent — running on the old architecture',
                }
          }
        />

        <CheckRow label="Supabase configuration" state={supabaseCheck} />

        <CheckRow label="Anonymous sign-ins" state={anonCheck} />

        <CheckRow
          label="Platform"
          state={{
            status: 'pass',
            detail: `${Platform.OS} ${String(Platform.Version)}`,
          }}
        />

        <Text className="text-xs leading-5 text-faint">
          Rates shown in Canji are indicative, sourced from market observation,
          and for information only. This screen shows no rates — it is a build
          check.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <View className="items-center gap-1">
      <View className={`h-10 w-16 rounded-lg ${className}`} />
      <Text className="text-[10px] text-faint">{label}</Text>
    </View>
  );
}

function CheckRow({ label, state }: { label: string; state: CheckState }) {
  const tone =
    state.status === 'pass'
      ? 'text-fresh'
      : state.status === 'fail'
        ? 'text-stale'
        : 'text-muted';

  const mark =
    state.status === 'pass' ? '✓' : state.status === 'fail' ? '✕' : '…';

  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className={`text-lg leading-6 ${tone}`}>{mark}</Text>
      <View className="flex-1 gap-1">
        <Text className="text-base text-ink">{label}</Text>
        <Text className="text-xs text-muted">
          {state.status === 'checking' ? 'Checking…' : state.detail}
        </Text>
      </View>
    </View>
  );
}
