import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  sourceDomain: string;
  sourceName: string;
};

export type NewsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; items: NewsItem[]; retry: () => void };

/**
 * Curated FX headlines. Aboki Rate holds a pointer to each article and nothing
 * more — no body text is stored, so none can be shown.
 */
export function useNews(): NewsState {
  const [state, setState] = useState<NewsState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    const { data, error } = await supabase
      .from('news_items')
      .select(
        'id, title, url, excerpt, image_url, published_at, source_domain, news_sources!source_domain(name)'
      )
      .eq('status', 'published')
      .order('sort_order')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) {
      setState({
        status: 'error',
        message: error.message,
        retry: () => void load(),
      });
      return;
    }

    setState({
      status: 'ready',
      retry: () => void load(),
      items: (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        excerpt: row.excerpt,
        imageUrl: row.image_url,
        publishedAt: row.published_at ? new Date(row.published_at) : null,
        sourceDomain: row.source_domain,
        // The join gives the publisher its canonical name, so an outlet
        // never appears under three spellings.
        sourceName: row.news_sources?.name ?? row.source_domain,
      })),
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
