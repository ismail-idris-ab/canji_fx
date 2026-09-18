import { createClient } from 'jsr:@supabase/supabase-js@2';

import { extractArticle, isReadable } from '../_shared/article.ts';

/**
 * read-article — fetches a published story and returns it as readable blocks.
 *
 * Reader-initiated, so unlike the scheduled functions it accepts any signed-in
 * caller. What it does not accept is a URL: it takes the id of a news item and
 * reads that item's own link from the database. A function that fetches
 * whatever address a caller supplies is an open proxy, and one restricted to
 * stories an Admin already approved cannot be pointed anywhere else.
 *
 * Nothing is stored. The article is fetched when a Reader asks for it and
 * kept nowhere, so a publisher's words never sit in this database, Readers
 * always get the current version including corrections, and honouring an
 * objection is a flag rather than a deletion exercise. See ADR 0008.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in required.' }, 401);

  // Acts as the calling Reader, so the published-only policy on news_items
  // decides what can be read. A pending or rejected story is invisible here
  // for the same reason it is invisible in the app.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } }
  );

  let id: string;
  try {
    const body = (await request.json()) as { id?: string };
    id = String(body.id ?? '');
    if (!id) throw new Error('missing id');
  } catch {
    return json({ error: 'Provide the id of a news item.' }, 400);
  }

  const { data: item, error } = await supabase
    .from('news_items')
    .select('url, title, source_domain, news_sources!source_domain(name, full_text)')
    .eq('id', id)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!item) return json({ error: 'Story not found.' }, 404);

  const source = item.news_sources;

  // A publisher who has asked not to be rendered here is not rendered here.
  if (source && source.full_text === false) {
    return json({ readable: false, reason: 'publisher', url: item.url });
  }

  let html: string;
  try {
    const response = await fetch(item.url, {
      headers: {
        'User-Agent': 'AbokiRateBot/1.0 (+https://abokirate.ng)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return json({ readable: false, reason: 'fetch', url: item.url });
    }

    // A cap on what is held in memory; articles are far smaller than this.
    html = (await response.text()).slice(0, 1_500_000);
  } catch {
    return json({ readable: false, reason: 'fetch', url: item.url });
  }

  const extraction = extractArticle(html);

  // A metered article yields a teaser and a subscribe prompt. Showing that as
  // though it were the story would misrepresent both the publisher and the
  // piece, so the app falls back to their own page instead.
  if (!isReadable(extraction)) {
    return json({ readable: false, reason: 'extraction', url: item.url });
  }

  return json({
    readable: true,
    url: item.url,
    title: item.title,
    sourceName: source?.name ?? item.source_domain,
    blocks: extraction.blocks,
    wordCount: extraction.wordCount,
  });
});
