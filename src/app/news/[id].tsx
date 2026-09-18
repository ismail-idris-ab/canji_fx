import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useArticle } from '@/hooks/use-article';
import { useNews } from '@/hooks/use-news';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/format';

/**
 * A story, read inside the app.
 *
 * The publisher's name appears under the headline, again at the foot, and on
 * a button that opens their own page. Aboki Rate renders their reporting in
 * its own typography with none of their advertising, so whose work it is must
 * be impossible to miss — that is the difference between attribution and
 * appropriation, and it costs a few lines of text.
 *
 * Sharing sends the publisher's URL, never a link to this screen. Anyone
 * receiving it lands on them.
 */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const now = useNow();

  const article = useArticle(id);
  const news = useNews();

  const item = useMemo(
    () =>
      news.status === 'ready'
        ? news.items.find((candidate) => candidate.id === id)
        : undefined,
    [news, id]
  );

  const url = article.status === 'ready' || article.status === 'unreadable'
    ? article.url
    : item?.url;

  const sourceName =
    (article.status === 'ready' ? article.sourceName : undefined) ??
    item?.sourceName ??
    '';

  // A page that cannot be rendered honestly here opens on the publisher's own
  // site — still inside the app, so the Reader never leaves, and a paywall
  // stays a paywall rather than being routed around.
  useEffect(() => {
    if (article.status === 'unreadable') {
      void WebBrowser.openBrowserAsync(article.url, {
        toolbarColor: '#0B0B0F',
        controlsColor: '#F5B301',
      });
    }
  }, [article]);

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-row items-center justify-between border-b border-line px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to news"
          className="active:opacity-70"
        >
          <Text className="text-base font-semibold text-accent">‹ News</Text>
        </Pressable>

        {url && (
          <Pressable
            onPress={() => void Share.share({ message: url })}
            accessibilityRole="button"
            accessibilityLabel="Share this story"
            className="active:opacity-70"
          >
            <Text className="text-sm font-semibold text-muted">Share</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 gap-5">
        {item && (
          <View className="gap-2">
            <Text className="text-2xl font-bold leading-8 text-ink">
              {item.title}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
                {sourceName}
              </Text>
              {item.publishedAt && (
                <>
                  <Text className="text-xs text-faint">·</Text>
                  <Text className="text-xs text-faint">
                    {formatRelative(item.publishedAt, now)}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {article.status === 'loading' && (
          <View className="items-center gap-3 p-8">
            <ActivityIndicator color="#F5B301" />
            <Text className="text-sm text-muted">Fetching the story…</Text>
          </View>
        )}

        {article.status === 'error' && (
          <View className="gap-3 rounded-2xl border border-stale/40 bg-surface p-5">
            <Text className="text-xs leading-5 text-muted">
              {article.message}
            </Text>
            <Pressable onPress={article.retry} className="active:opacity-70">
              <Text className="text-sm font-semibold text-accent">
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {article.status === 'unreadable' && (
          <View className="gap-3 rounded-2xl border border-line bg-surface p-5">
            <Text className="text-sm leading-6 text-muted">
              This story could not be shown here, so it opened on{' '}
              {sourceName || 'the publisher’s site'} instead.
            </Text>
            <Pressable
              onPress={() => void WebBrowser.openBrowserAsync(article.url)}
              className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-accent">
                Open it again
              </Text>
            </Pressable>
          </View>
        )}

        {article.status === 'ready' && (
          <>
            <View className="gap-4">
              {article.blocks.map((block, index) => {
                if (block.type === 'heading') {
                  return (
                    <Text
                      key={index}
                      className="pt-2 text-lg font-bold leading-7 text-ink"
                    >
                      {block.text}
                    </Text>
                  );
                }

                if (block.type === 'listItem') {
                  return (
                    <View key={index} className="flex-row gap-3 pl-1">
                      <Text className="text-base leading-7 text-muted">•</Text>
                      <Text className="flex-1 text-base leading-7 text-muted">
                        {block.text}
                      </Text>
                    </View>
                  );
                }

                return (
                  <Text
                    key={index}
                    className="text-base leading-7 text-muted"
                  >
                    {block.text}
                  </Text>
                );
              })}
            </View>

            <View className="gap-3 border-t border-line pt-5">
              <Text className="text-xs leading-5 text-faint">
                This story was written and published by {sourceName}. Aboki
                Rate shows it here for convenience; the reporting is theirs.
              </Text>

              <Pressable
                onPress={() => void WebBrowser.openBrowserAsync(article.url)}
                className="rounded-xl bg-raised px-4 py-3 active:opacity-70"
              >
                <Text className="text-center text-sm font-semibold text-accent">
                  Read on {sourceName}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
