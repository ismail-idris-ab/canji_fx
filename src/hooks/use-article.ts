import { useCallback, useEffect, useState } from 'react';

import type { Block } from '@/domain/article';
import { supabase } from '@/lib/supabase';

/**
 * Fetches one story's text for reading inside the app.
 *
 * Nothing is stored: the article is fetched when a Reader asks and kept
 * nowhere, so a publisher's words never sit in this database, a Reader always
 * gets the current version including corrections, and honouring an objection
 * is a flag rather than a deletion exercise. See ADR 0008.
 *
 * `unreadable` is not an error. A paywalled or heavily scripted page cannot
 * be rendered honestly here, so the screen falls back to the publisher's own
 * page in an in-app browser — the Reader still reads the story without
 * leaving the app.
 */

export type ArticleState =
  | { status: 'loading' }
  | { status: 'ready'; blocks: Block[]; sourceName: string; url: string }
  | { status: 'unreadable'; url: string; reason: string }
  | { status: 'error'; message: string; retry: () => void };

type ArticleResponse = {
  readable: boolean;
  url: string;
  reason?: string;
  sourceName?: string;
  blocks?: Block[];
};

export function useArticle(id: string | undefined): ArticleState {
  const [state, setState] = useState<ArticleState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!id) return;

    setState({ status: 'loading' });

    const { data, error } = await supabase.functions.invoke<ArticleResponse>(
      'read-article',
      { body: { id } }
    );

    if (error || !data) {
      setState({
        status: 'error',
        message: error?.message ?? 'Could not load the story.',
        retry: () => void load(),
      });
      return;
    }

    if (!data.readable || !data.blocks) {
      setState({
        status: 'unreadable',
        url: data.url,
        reason: data.reason ?? 'extraction',
      });
      return;
    }

    setState({
      status: 'ready',
      blocks: data.blocks,
      sourceName: data.sourceName ?? '',
      url: data.url,
    });
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
