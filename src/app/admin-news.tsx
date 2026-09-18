import { useRouter } from 'expo-router';
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

import { QueueCard } from '@/components/queue-card';
import { useAdmin } from '@/hooks/use-admin';
import { useNewsQueue } from '@/hooks/use-news-queue';
import { supabase } from '@/lib/supabase';

type Preview = {
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
  canonicalUrl: string;
  sourceDomain: string;
  sourceName: string;
};

type Mode = 'queue' | 'live' | 'link';

/**
 * News curation.
 *
 * Feeds fill a queue every six hours; the Admin decides what a Reader sees.
 * Nothing is published automatically — the day a publisher runs something
 * wrong, "we chose it" is a far better position than "our robot fetched it".
 *
 * The paste-a-link path stays, because two publishers refuse automation and
 * a story worth linking sometimes comes from neither a feed nor a Nigerian
 * outlet at all.
 */
export default function AdminNewsScreen() {
  const admin = useAdmin();
  const router = useRouter();
  const isAdmin = admin.status === 'admin';
  const queue = useNewsQueue(isAdmin);

  const [mode, setMode] = useState<Mode>('queue');

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-ground">
        <View className="gap-4 p-5">
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-sm font-semibold text-accent">‹ Back</Text>
          </Pressable>
          <Text className="text-sm text-muted">
            {admin.status === 'checking'
              ? 'Checking…'
              : 'Sign in as an admin from the rate entry screen first.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount =
    queue.status === 'ready' ? queue.pending.length : undefined;

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <Pressable
          onPress={() => router.back()}
          className="self-start active:opacity-70"
        >
          <Text className="text-sm font-semibold text-accent">‹ Back</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            News
          </Text>
          <Text className="text-sm text-muted">
            Nothing reaches Readers until you approve it
          </Text>
        </View>

        <View className="flex-row gap-1 rounded-xl border border-line bg-surface p-1">
          <Tab
            label={
              pendingCount === undefined ? 'Queue' : `Queue (${pendingCount})`
            }
            active={mode === 'queue'}
            onPress={() => setMode('queue')}
          />
          <Tab
            label="Live"
            active={mode === 'live'}
            onPress={() => setMode('live')}
          />
          <Tab
            label="Add link"
            active={mode === 'link'}
            onPress={() => setMode('link')}
          />
        </View>

        {mode === 'link' ? (
          <AddByLink
            userId={admin.userId}
            onAdded={() => {
              if (queue.status !== 'loading') queue.retry();
            }}
          />
        ) : (
          <QueueList queue={queue} mode={mode} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-lg py-2.5 active:opacity-70 ${
        active ? 'bg-raised' : ''
      }`}
    >
      <Text
        className={`text-center text-sm font-semibold ${
          active ? 'text-accent' : 'text-muted'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QueueList({
  queue,
  mode,
}: {
  queue: ReturnType<typeof useNewsQueue>;
  mode: Mode;
}) {
  const items = useMemo(() => {
    if (queue.status !== 'ready') return [];
    return mode === 'queue' ? queue.pending : queue.published;
  }, [queue, mode]);

  // Marks the second and later items covering one event, so repeats sit
  // together and the Admin can pick the better write-up rather than having
  // the earliest-polled one chosen for them.
  const seenGroups = new Map<string, string>();

  if (queue.status === 'loading') {
    return (
      <View className="items-center p-8">
        <ActivityIndicator color="#F5B301" />
      </View>
    );
  }

  if (queue.status === 'error') {
    return (
      <View className="gap-3 rounded-2xl border border-stale/40 bg-surface p-5">
        <Text className="text-xs leading-5 text-muted">{queue.message}</Text>
        <Pressable onPress={queue.retry} className="active:opacity-70">
          <Text className="text-sm font-semibold text-accent">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="rounded-2xl border border-line bg-surface p-5">
        <Text className="text-sm leading-5 text-muted">
          {mode === 'queue'
            ? 'Nothing waiting. Feeds are polled every six hours, and only stories mentioning the naira, the CBN or the FX market reach this queue.'
            : 'Nothing live yet. Approve something from the queue.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {items.map((item) => {
        const duplicateOf = seenGroups.get(item.group);
        if (!duplicateOf) seenGroups.set(item.group, item.sourceName);

        return (
          <QueueCard
            key={item.id}
            item={item}
            duplicateOf={duplicateOf}
            actions={
              mode === 'queue'
                ? [
                    {
                      label: 'Publish',
                      tone: 'approve',
                      run: () => void queue.approve(item.id),
                    },
                    {
                      label: 'Reject',
                      tone: 'reject',
                      run: () => void queue.reject(item.id),
                    },
                  ]
                : [
                    {
                      label: item.sortOrder < 0 ? 'Unpin' : 'Pin to top',
                      tone: 'quiet',
                      run: () =>
                        void queue.setPinned(item.id, item.sortOrder >= 0),
                    },
                    {
                      label: 'Take down',
                      tone: 'reject',
                      run: () => void queue.takeDown(item.id),
                    },
                  ]
            }
          />
        );
      })}
    </View>
  );
}

/**
 * The manual path. Kept because TheCable refuses automated requests,
 * ThisDay's feed is dead, and a story worth linking sometimes comes from
 * neither a feed nor a Nigerian outlet.
 */
function AddByLink({
  userId,
  onAdded,
}: {
  userId: string;
  onAdded: () => void;
}) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unknownDomain, setUnknownDomain] = useState<string | null>(null);
  const [publisherName, setPublisherName] = useState('');

  async function fetchPreview() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setPreview(null);
    setUnknownDomain(null);

    const { data, error: invokeError } = await supabase.functions.invoke<
      Preview & { error?: string; domain?: string }
    >('scrape-og', { body: { url: url.trim() } });

    setBusy(false);

    if (invokeError) {
      const detail = await readError(invokeError);
      setError(detail.message);
      setUnknownDomain(detail.domain ?? null);
      setPublisherName('');
      return;
    }

    if (!data || data.error) {
      setError(data?.error ?? 'Could not read that page.');
      return;
    }

    setPreview(data);
  }

  async function addPublisher() {
    if (!unknownDomain || !publisherName.trim()) return;

    setBusy(true);
    const { error: insertError } = await supabase
      .from('news_sources')
      .insert({ domain: unknownDomain, name: publisherName.trim() });
    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setUnknownDomain(null);
    setError(null);
    await fetchPreview();
  }

  async function publish() {
    if (!preview) return;

    setBusy(true);
    // Straight to published: an Admin pasting a link has already decided.
    const { error: insertError } = await supabase.from('news_items').insert({
      title: preview.title,
      url: preview.canonicalUrl,
      image_url: preview.imageUrl,
      published_at: preview.publishedAt,
      source_domain: preview.sourceDomain,
      created_by: userId,
      status: 'published',
    });
    setBusy(false);

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'That article is already in the list.'
          : insertError.message
      );
      return;
    }

    setPreview(null);
    setUrl('');
    setMessage('Published.');
    onAdded();
  }

  return (
    <View className="gap-4">
      <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          placeholderTextColor="#5A5A68"
          autoCapitalize="none"
          keyboardType="url"
          className="rounded-xl bg-raised px-4 py-3 text-base text-ink"
        />

        <Pressable
          onPress={() => void fetchPreview()}
          disabled={busy || url.trim().length === 0}
          className={`rounded-xl px-4 py-3 active:opacity-70 ${
            busy || !url.trim() ? 'bg-raised' : 'bg-accent'
          }`}
        >
          <Text
            className={`text-center text-sm font-bold ${
              busy || !url.trim() ? 'text-faint' : 'text-ground'
            }`}
          >
            {busy ? 'Reading…' : 'Read the page'}
          </Text>
        </Pressable>

        {error && <Text className="text-xs leading-5 text-stale">{error}</Text>}
        {message && <Text className="text-xs text-fresh">{message}</Text>}
      </View>

      {unknownDomain && (
        <View className="gap-3 rounded-2xl border border-aging/30 bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
            Add {unknownDomain} as a publisher
          </Text>
          <Text className="text-xs leading-5 text-muted">
            Only add a publisher you trust. Anything from this domain becomes
            linkable afterwards.
          </Text>
          <TextInput
            value={publisherName}
            onChangeText={setPublisherName}
            placeholder="Display name"
            placeholderTextColor="#5A5A68"
            className="rounded-xl bg-raised px-4 py-3 text-base text-ink"
          />
          <Pressable
            onPress={() => void addPublisher()}
            disabled={busy || !publisherName.trim()}
            className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-accent">
              Add publisher
            </Text>
          </Pressable>
        </View>
      )}

      {preview && (
        <View className="gap-4">
          <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
            This is what Readers will see
          </Text>

          <View className="gap-2 rounded-2xl border border-line bg-surface p-4">
            <Text className="text-base font-semibold leading-6 text-ink">
              {preview.title}
            </Text>
            <Text className="text-xs font-semibold text-accent">
              {preview.sourceName}
            </Text>
          </View>

          <Pressable
            onPress={() => void publish()}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-3 active:opacity-70"
          >
            <Text className="text-center text-sm font-bold text-ground">
              Publish
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Pulls the reason out of a failed function invocation. */
async function readError(
  error: unknown
): Promise<{ message: string; domain?: string }> {
  const response = (error as { context?: Response }).context;

  if (response && typeof response.json === 'function') {
    try {
      const body = (await response.json()) as {
        error?: string;
        domain?: string;
      };
      if (body.error) return { message: body.error, domain: body.domain };
    } catch {
      // Fall through to the generic message.
    }
  }

  return {
    message:
      error instanceof Error ? error.message : 'Could not read that page.',
  };
}
