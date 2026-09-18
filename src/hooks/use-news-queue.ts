import { useCallback, useEffect, useState } from 'react';

import { groupKey } from '@/domain/rss';
import { supabase } from '@/lib/supabase';

/**
 * The Admin's view of news: what is waiting, and what is live.
 *
 * Readers only ever see published items; this hook exists behind the admin
 * gate and relies on the policy that lets an Admin read every row.
 */

export type QueuedItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  sourceName: string;
  sourceDomain: string;
  publishedAt: Date | null;
  sortOrder: number;
  /**
   * Shared by items whose headlines are near-identical, so several outlets
   * covering one event sit together. They are grouped rather than dropped:
   * sometimes the second write-up is the better one, and that choice belongs
   * to the Admin.
   */
  group: string;
};

export type NewsQueueState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | {
      status: 'ready';
      pending: QueuedItem[];
      published: QueuedItem[];
      approve: (id: string) => Promise<void>;
      reject: (id: string) => Promise<void>;
      takeDown: (id: string) => Promise<void>;
      setPinned: (id: string, pinned: boolean) => Promise<void>;
      retry: () => void;
    };

const PINNED_ORDER = -1;

export function useNewsQueue(enabled: boolean): NewsQueueState {
  const [state, setState] = useState<NewsQueueState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!enabled) return;

    const { data, error } = await supabase
      .from('news_items')
      .select(
        'id, title, url, excerpt, status, sort_order, published_at, source_domain, news_sources!source_domain(name)'
      )
      .in('status', ['pending', 'published'])
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(200);

    if (error) {
      setState({
        status: 'error',
        message: error.message,
        retry: () => void load(),
      });
      return;
    }

    const rows = data ?? [];

    const shape = (row: (typeof rows)[number]): QueuedItem => ({
      id: row.id,
      title: row.title,
      url: row.url,
      excerpt: row.excerpt,
      sourceName: row.news_sources?.name ?? row.source_domain,
      sourceDomain: row.source_domain,
      publishedAt: row.published_at ? new Date(row.published_at) : null,
      sortOrder: row.sort_order,
      group: groupKey(row.title),
    });

    setState({
      status: 'ready',
      pending: rows.filter((r) => r.status === 'pending').map(shape),
      published: rows
        .filter((r) => r.status === 'published')
        .map(shape)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
        ),
      approve,
      reject,
      takeDown,
      setPinned,
      retry: () => void load(),
    });
  }, [enabled]);

  const setStatus = useCallback(
    async (id: string, status: 'published' | 'rejected' | 'pending') => {
      await supabase.from('news_items').update({ status }).eq('id', id);
      await load();
    },
    [load]
  );

  const approve = useCallback(
    (id: string) => setStatus(id, 'published'),
    [setStatus]
  );

  // Rejected rows are kept, never deleted. Deleting one would let the next
  // poll queue the same story again.
  const reject = useCallback(
    (id: string) => setStatus(id, 'rejected'),
    [setStatus]
  );

  // Taking a live story down is a rejection too — it is out of the app and
  // must not come back on the next poll.
  const takeDown = useCallback(
    (id: string) => setStatus(id, 'rejected'),
    [setStatus]
  );

  const setPinned = useCallback(
    async (id: string, pinned: boolean) => {
      await supabase
        .from('news_items')
        .update({ sort_order: pinned ? PINNED_ORDER : 0 })
        .eq('id', id);
      await load();
    },
    [load]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
