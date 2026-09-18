import { Pressable, Text, View } from 'react-native';

import type { NewsItem } from '@/hooks/use-news';
import { formatRelative } from '@/lib/format';

/**
 * One story in the list.
 *
 * No image: the excerpt does the work a picture used to, and hot-linking a
 * publisher's assets was never worth the broken images it produced. The
 * accent bar gives a dense list its rhythm instead.
 *
 * The publisher's name sits under every headline. Aboki Rate renders their
 * reporting in its own typography, so whose work it is must be unmistakable
 * on every surface it appears — the list included.
 */
export function NewsCard({
  item,
  now,
  onPress,
}: {
  item: NewsItem;
  now: Date;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.sourceName}`}
      className="flex-row overflow-hidden rounded-xl border border-line bg-surface active:opacity-70"
    >
      <View className="w-1 bg-accent" />

      <View className="flex-1 gap-2 p-4">
        <Text className="text-base font-semibold leading-6 text-ink">
          {item.title}
        </Text>

        {item.excerpt && (
          <Text className="text-xs leading-5 text-muted" numberOfLines={2}>
            {item.excerpt}
          </Text>
        )}

        <View className="flex-row items-center justify-between pt-0.5">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-accent">
            {item.sourceName}
          </Text>
          {item.publishedAt && (
            <Text className="text-[11px] text-faint">
              {formatRelative(item.publishedAt, now)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
