import { createClient } from 'jsr:@supabase/supabase-js@2';

import { calledByScheduler, refuse } from '../_lib/cron-auth.ts';
import { groupKey, isRelevant, parseFeed } from '../_shared/rss.ts';

/**
 * fetch-news — polls publisher feeds into the approval queue.
 *
 * Nothing published here. Items land as `pending` and wait for an Admin,
 * which keeps the property that matters: every story a Reader sees is one a
 * human chose to link. Automatic publishing would put unreviewed headlines
 * under this brand, and the day a publisher runs something wrong, "our robot
 * fetched it" is a much weaker position than "we chose it".
 *
 * Every decision about what a feed means lives in the shared rss module,
 * which is pure and tested. This function only performs I/O.
 */

const FETCH_TIMEOUT_MS = 20_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (!(await calledByScheduler(request, supabase))) return refuse();

  // Only publishers with a feed. A null rss_url means recognised but not
  // polled — TheCable refuses declared bots and ThisDay's feed path is dead,
  // and both stay linkable by hand rather than impersonated past a refusal.
  const { data: sources, error: sourceError } = await supabase
    .from('news_sources')
    .select('domain, name, rss_url')
    .eq('is_active', true)
    .not('rss_url', 'is', null);

  if (sourceError) return json({ error: sourceError.message }, 500);
  if (!sources || sources.length === 0) return json({ polled: 0, queued: 0 });

  const candidates: {
    title: string;
    url: string;
    excerpt: string | null;
    published_at: string | null;
    source_domain: string;
    feed_domain: string;
    status: 'pending';
  }[] = [];

  const failures: { domain: string; reason: string }[] = [];

  for (const source of sources) {
    try {
      const response = await fetch(source.rss_url!, {
        headers: {
          // Identified honestly. A publisher refusing this is refusing
          // automation, and that refusal is respected rather than evaded.
          'User-Agent': 'AbokiRateBot/1.0 (+https://abokirate.ng)',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        failures.push({
          domain: source.domain,
          reason: `HTTP ${response.status}`,
        });
        continue;
      }

      const items = parseFeed(await response.text());

      if (items.length === 0) {
        failures.push({ domain: source.domain, reason: 'no items parsed' });
        continue;
      }

      for (const item of items) {
        // A loose filter, on headline and excerpt together. A whole
        // publication's feed is mostly irrelevant here; this saves the Admin
        // scrolling rather than deciding for them.
        if (!isRelevant(item)) continue;

        candidates.push({
          title: item.title,
          url: item.url,
          excerpt: item.excerpt,
          published_at: item.publishedAt,
          source_domain: source.domain,
          feed_domain: source.domain,
          status: 'pending',
        });
      }
    } catch (error) {
      failures.push({ domain: source.domain, reason: String(error) });
    }
  }

  if (candidates.length === 0) {
    if (failures.length === sources.length) {
      await supabase.from('system_events').insert({
        kind: 'news_all_feeds_failed',
        detail: { failures },
      });
      return json({ error: 'Every feed failed.', failures }, 502);
    }

    return json({ polled: sources.length, queued: 0, failures });
  }

  // Anything already seen — pending, published, or previously rejected. A
  // rejected story must never return to the queue, which is why those rows
  // are kept rather than purged.
  const { data: known, error: knownError } = await supabase
    .from('news_items')
    .select('url')
    .in(
      'url',
      candidates.map((candidate) => candidate.url)
    );

  if (knownError) return json({ error: knownError.message }, 500);

  const seen = new Set((known ?? []).map((row) => row.url));

  const fresh = candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    // A feed can carry the same link twice within one poll.
    seen.add(candidate.url);
    return true;
  });

  if (fresh.length === 0) {
    return json({ polled: sources.length, queued: 0, failures });
  }

  const { error: insertError } = await supabase
    .from('news_items')
    .insert(fresh);

  if (insertError) return json({ error: insertError.message }, 500);

  if (failures.length > 0) {
    await supabase.from('system_events').insert({
      kind: 'news_feed_failures',
      detail: { failures },
    });
  }

  return json({
    polled: sources.length,
    queued: fresh.length,
    // Near-identical headlines, so the Admin can see at a glance which
    // entries cover the same event rather than having them silently dropped.
    groups: [...new Set(fresh.map((item) => groupKey(item.title)))].length,
    failures,
  });
});
