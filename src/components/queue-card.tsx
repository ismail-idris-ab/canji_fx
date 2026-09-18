import { Linking, Pressable, Text, View } from 'react-native';

import type { QueuedItem } from '@/hooks/use-news-queue';
import { formatWatDay } from '@/lib/format';

/**
 * One item awaiting a decision, or one already live.
 *
 * The headline and excerpt are shown exactly as a Reader would see them, so
 * approving is a judgement about the thing itself rather than about a
 * database row. Tapping opens the original, because the only way to judge a
 * story properly is to read it.
 */
export function QueueCard({
  item,
  duplicateOf,
  actions,
}: {
  item: QueuedItem;
  /** Set when an earlier card in the list covers the same event. */
  duplicateOf?: string;
  actions: { label: string; tone: 'approve' | 'reject' | 'quiet'; run: () => void }[];
}) {
  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      {duplicateOf && (
        <Text className="text-[11px] font-semibold text-aging">
          Also covered by {duplicateOf}
        </Text>
      )}

      <Pressable
        onPress={() => void Linking.openURL(item.url)}
        accessibilityRole="link"
        accessibilityLabel={`${item.title}. Opens in your browser.`}
        className="gap-1.5 active:opacity-70"
      >
        <Text className="text-base font-semibold leading-6 text-ink">
          {item.title}
        </Text>

        {item.excerpt && (
          <Text className="text-xs leading-5 text-muted" numberOfLines={3}>
            {item.excerpt}
          </Text>
        )}

        <View className="flex-row items-center gap-2 pt-0.5">
          <Text className="text-[11px] font-semibold text-accent">
            {item.sourceName}
          </Text>
          {item.publishedAt && (
            <>
              <Text className="text-[11px] text-faint">·</Text>
              <Text className="text-[11px] text-faint">
                {formatWatDay(item.publishedAt)}
              </Text>
            </>
          )}
          <Text className="text-[11px] text-faint">· Tap to read</Text>
        </View>
      </Pressable>

      <View className="flex-row gap-2 border-t border-line pt-3">
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.run}
            className={`flex-1 rounded-lg py-2 active:opacity-70 ${
              action.tone === 'approve' ? 'bg-accent' : 'bg-raised'
            }`}
          >
            <Text
              className={`text-center text-xs font-bold ${
                action.tone === 'approve'
                  ? 'text-ground'
                  : action.tone === 'reject'
                    ? 'text-stale'
                    : 'text-muted'
              }`}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
