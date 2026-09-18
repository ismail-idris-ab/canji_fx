import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NewsCard } from '@/components/news-card';
import { useNews } from '@/hooks/use-news';
import { useNow } from '@/hooks/use-now';

/**
 * News list.
 *
 * Stories are gathered from publisher feeds and chosen by hand, so the list
 * stays short and relevant rather than becoming a wire feed. Tapping opens
 * the story inside the app, always crediting the outlet that reported it.
 */
export default function NewsScreen() {
  const state = useNews();
  const router = useRouter();
  const now = useNow();

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView
        contentContainerClassName="px-5 py-6 gap-3"
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
        <View className="gap-1 pb-2">
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
              No stories yet. Headlines are gathered from Nigerian publishers
              and chosen by hand, so this stays short and relevant.
            </Text>
          </View>
        )}

        {state.status === 'ready' &&
          state.items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              now={now}
              onPress={() => router.push(`/news/${item.id}`)}
            />
          ))}

        <Text className="pt-2 text-xs leading-5 text-faint">
          Every story is written and published by the outlet named on it. Aboki
          Rate selects and links; the reporting is theirs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
