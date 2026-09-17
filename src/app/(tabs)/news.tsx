import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNews, type NewsItem } from '@/hooks/use-news';
import { formatWatDay } from '@/lib/format';

/**
 * News list.
 *
 * Each card is a pointer to somebody else's article. Tapping opens the
 * original in the system browser so the publisher gets the visit; Aboki Rate
 * never renders their text.
 */
export default function NewsScreen() {
  const state = useNews();

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView
        contentContainerClassName="px-5 py-6 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={state.status === 'loading'}
            onRefresh={() => {
              if (state.status !== 'loading') state.retry();
            }}
            tintColor="#F5B301"
            colors={['#F5B301']}
            progressBackgroundColor="#15151C"
          />
        }
      >
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-ink">
            News
          </Text>
          <Text className="text-sm text-muted">
            Why the rate moved, from the people who reported it
          </Text>
        </View>

        {state.status === 'loading' && (
          <View className="items-center gap-3 rounded-2xl border border-line bg-surface p-8">
            <ActivityIndicator color="#F5B301" />
          </View>
        )}

        {state.status === 'error' && (
          <View className="gap-3 rounded-2xl border border-stale/40 bg-surface p-5">
            <Text className="text-sm font-semibold text-stale">
              Could not load news
            </Text>
            <Text className="text-xs leading-5 text-muted">
              {state.message}
            </Text>
            <Pressable
              onPress={state.retry}
              className="self-start rounded-lg bg-raised px-4 py-2 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-accent">
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {state.status === 'ready' && state.items.length === 0 && (
          <View className="gap-2 rounded-2xl border border-line bg-surface p-5">
            <Text className="text-sm leading-5 text-muted">
              No stories yet. Headlines are chosen by hand rather than pulled
              in automatically, so this stays short and relevant.
            </Text>
          </View>
        )}

        {state.status === 'ready' &&
          state.items.map((item) => <NewsCard key={item.id} item={item} />)}

        <Text className="text-xs leading-5 text-faint">
          Headlines and images belong to their publishers. Aboki Rate links to the
          original and stores no article text.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  // Images are hot-linked rather than re-hosted, which keeps Aboki Rate an index
  // rather than a copy. Hot-linking can fail, so the card must survive it.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;

  return (
    <Pressable
      onPress={() => void Linking.openURL(item.url)}
      accessibilityRole="link"
      accessibilityLabel={`${item.title}, ${item.sourceName}. Opens in your browser.`}
      className="overflow-hidden rounded-2xl border border-line bg-surface active:opacity-70"
    >
      {showImage && (
        <Image
          source={{ uri: item.imageUrl! }}
          style={{ width: '100%', height: 160 }}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
        />
      )}

      <View className="gap-2 p-4">
        <Text className="text-base font-semibold leading-6 text-ink">
          {item.title}
        </Text>

        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-semibold text-accent">
            {item.sourceName}
          </Text>
          {item.publishedAt && (
            <>
              <Text className="text-xs text-faint">·</Text>
              <Text className="text-xs text-faint">
                {formatWatDay(item.publishedAt)}
              </Text>
            </>
          )}
          <Text className="text-xs text-faint">· Opens in browser</Text>
        </View>
      </View>
    </Pressable>
  );
}
