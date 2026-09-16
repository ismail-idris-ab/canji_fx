import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdmin } from '@/hooks/use-admin';
import { supabase } from '@/lib/supabase';

type Preview = {
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
  canonicalUrl: string;
  sourceDomain: string;
  sourceName: string;
};

/**
 * News curation.
 *
 * Paste a URL, see what was extracted, approve it. The Admin always reviews
 * before anything reaches a Reader, because a publisher's Open Graph title
 * is sometimes promotional rather than the headline.
 */
export default function AdminNewsScreen() {
  const admin = useAdmin();
  const router = useRouter();

  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Set when the publisher is unrecognised, so the Admin can add it without
  // leaving the screen — a story breaking on an unlisted site at 11pm should
  // not require a migration.
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
      // A non-2xx carries the reason in its body, which is more useful than
      // the generic message the client throws.
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
    if (!preview || admin.status !== 'admin') return;

    setBusy(true);
    const { error: insertError } = await supabase.from('news_items').insert({
      title: preview.title,
      url: preview.canonicalUrl,
      image_url: preview.imageUrl,
      published_at: preview.publishedAt,
      source_domain: preview.sourceDomain,
      created_by: admin.userId,
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
  }

  if (admin.status !== 'admin') {
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

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        <Pressable onPress={() => router.back()} className="self-start active:opacity-70">
          <Text className="text-sm font-semibold text-accent">‹ Back</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Add a story
          </Text>
          <Text className="text-sm text-muted">
            Paste a link from a recognised publisher
          </Text>
        </View>

        <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://nairametrics.com/…"
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
              Only add a publisher you trust. Anything from this domain will be
              linkable afterwards.
            </Text>
            <TextInput
              value={publisherName}
              onChangeText={setPublisherName}
              placeholder="Display name, e.g. Nairametrics"
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

        {busy && !preview && (
          <View className="items-center p-4">
            <ActivityIndicator color="#F5B301" />
          </View>
        )}

        {preview && (
          <View className="gap-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-faint">
              This is what Readers will see
            </Text>

            <View className="overflow-hidden rounded-2xl border border-line bg-surface">
              {preview.imageUrl && (
                <Image
                  source={{ uri: preview.imageUrl }}
                  style={{ width: '100%', height: 160 }}
                  contentFit="cover"
                />
              )}
              <View className="gap-2 p-4">
                <Text className="text-base font-semibold leading-6 text-ink">
                  {preview.title}
                </Text>
                <Text className="text-xs font-semibold text-accent">
                  {preview.sourceName}
                </Text>
              </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

/** Pulls the reason out of a failed function invocation. */
async function readError(
  error: unknown
): Promise<{ message: string; domain?: string }> {
  const response = (error as { context?: Response }).context;

  if (response && typeof response.json === 'function') {
    try {
      const body = (await response.json()) as { error?: string; domain?: string };
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
