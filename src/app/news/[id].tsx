import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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

import type { Block } from '@/domain/article';
import { useArticle } from '@/hooks/use-article';
import { useNews } from '@/hooks/use-news';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/format';
import { useAppFonts } from '@/lib/fonts';

/**
 * A story, read inside the app.
 *
 * The one screen that leaves the app's dark palette behind. Amber on
 * near-black is right for scanning rates and punishing for a thousand words
 * of prose, so an article gets its own ground — pale ledger stock, the paper
 * this subject actually lives on. The chrome stays dark, so it still reads as
 * Aboki Rate rather than a different application.
 *
 * The publisher is named under the headline, again at the foot, and on a
 * button to their site. Their reporting is set in our typography with none of
 * their advertising, so whose work it is must be impossible to miss. See
 * ADR 0008.
 */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const now = useNow();
  const fontsLoaded = useAppFonts();

  const article = useArticle(id);
  const news = useNews();

  const item = useMemo(
    () =>
      news.status === 'ready'
        ? news.items.find((candidate) => candidate.id === id)
        : undefined,
    [news, id]
  );

  const url =
    article.status === 'ready' || article.status === 'unreadable'
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
      {/* Chrome stays dark: the reader is still inside Aboki Rate. */}
      <View className="flex-row items-center justify-between px-5 py-3">
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

      <ScrollView className="flex-1 bg-paper" contentContainerClassName="pb-16">
        <View className="gap-5 px-6 pt-8">
          {item && (
            <View className="gap-4">
              <Text
                className={`text-[30px] leading-[38px] text-paper-ink ${
                  fontsLoaded ? 'font-display' : 'font-bold'
                }`}
              >
                {item.title}
              </Text>

              <View className="flex-row items-center gap-2">
                <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-paper-mark">
                  {sourceName}
                </Text>
                {item.publishedAt && (
                  <>
                    <Text className="text-[11px] text-paper-soft">·</Text>
                    <Text className="text-[11px] text-paper-soft">
                      {formatRelative(item.publishedAt, now)}
                    </Text>
                  </>
                )}
              </View>

              <View className="h-px bg-paper-rule" />
            </View>
          )}

          {article.status === 'loading' && (
            <View className="items-center gap-3 py-16">
              <ActivityIndicator color="#8A5A00" />
              <Text className="text-sm text-paper-soft">
                Fetching the story…
              </Text>
            </View>
          )}

          {article.status === 'error' && (
            <View className="gap-3 py-8">
              <Text className="text-sm leading-6 text-paper-soft">
                {article.message}
              </Text>
              <Pressable onPress={article.retry} className="active:opacity-70">
                <Text className="text-sm font-semibold text-paper-mark">
                  Try again
                </Text>
              </Pressable>
            </View>
          )}

          {article.status === 'unreadable' && (
            <View className="gap-3 py-8">
              <Text className="text-base leading-7 text-paper-soft">
                This story could not be laid out here, so it opened on{' '}
                {sourceName || 'the publisher’s site'} instead.
              </Text>
              <Pressable
                onPress={() => void WebBrowser.openBrowserAsync(article.url)}
                className="self-start rounded-lg border border-paper-rule px-4 py-2 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-paper-mark">
                  Open it again
                </Text>
              </Pressable>
            </View>
          )}

          {article.status === 'ready' && (
            <>
              <View className="gap-5 pt-1">
                {article.blocks.map((block, index) => (
                  <ArticleBlock
                    key={index}
                    block={block}
                    isLede={index === 0 && block.type === 'paragraph'}
                    fontsLoaded={fontsLoaded}
                  />
                ))}
              </View>

              <View className="mt-10 gap-4 border-t border-paper-rule pt-6">
                <Text className="text-[13px] leading-6 text-paper-soft">
                  Written and published by {sourceName}. Aboki Rate selects and
                  displays it; the reporting is theirs.
                </Text>

                <Pressable
                  onPress={() => void WebBrowser.openBrowserAsync(article.url)}
                  className="rounded-xl border border-paper-mark/30 px-4 py-3 active:opacity-70"
                >
                  <Text className="text-center text-sm font-bold text-paper-mark">
                    Read on {sourceName}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The opening paragraph is set larger than the rest — an editorial lede,
 * which gives a wall of even paragraphs somewhere to start.
 */
function ArticleBlock({
  block,
  isLede,
  fontsLoaded,
}: {
  block: Block;
  isLede: boolean;
  fontsLoaded: boolean;
}) {
  const body = fontsLoaded ? 'font-read' : '';

  if (block.type === 'heading') {
    return (
      <Text
        className={`pt-4 text-[19px] leading-7 text-paper-ink ${
          fontsLoaded ? 'font-display' : 'font-bold'
        }`}
      >
        {block.text}
      </Text>
    );
  }

  if (block.type === 'listItem') {
    return (
      <View className="flex-row gap-3 pl-1">
        <Text className={`text-[17px] leading-[30px] text-paper-mark ${body}`}>
          —
        </Text>
        <Text
          className={`flex-1 text-[17px] leading-[30px] text-paper-ink ${body}`}
        >
          {block.text}
        </Text>
      </View>
    );
  }

  return (
    <Text
      className={`text-paper-ink ${body} ${
        isLede ? 'text-[20px] leading-[33px]' : 'text-[17px] leading-[30px]'
      }`}
    >
      {block.text}
    </Text>
  );
}
