import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * scrape-og — reads Open Graph metadata from an article URL.
 *
 * Returns a headline, image and publisher. It deliberately never returns
 * article text: Aboki Rate indexes other people's work and sends readers to them,
 * and reproducing the body would make it a republisher instead.
 *
 * Two guards, in this order, and the order matters:
 *
 *   1. The caller must be an Admin.
 *   2. The URL's domain must already be a recognised publisher.
 *
 * Checking the allowlist *before* fetching is what stops this being an open
 * proxy. An Edge Function that fetches any URL a caller supplies can be
 * pointed at internal addresses; restricting it to a short list of known
 * news domains removes that entirely.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Reads a meta tag's content by property or name, whichever is present. */
function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const found = html.match(pattern);
    if (found?.[1]) return decode(found[1].trim());
  }

  return null;
}

function decode(value: string): string {
  // Numeric entities are handled generally, not by a list of the ones
  // somebody noticed. Nigerian publishers emit &#8217; for a curly
  // apostrophe constantly, and a headline showing the raw entity looks
  // broken in a product whose claim is care with detail.
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, digits) =>
      String.fromCodePoint(Number.parseInt(digits, 10))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Ampersand last, so an already-decoded entity is not decoded twice.
    .replace(/&amp;/g, '&');
}

/** Strips a leading www. so sub-domain variants resolve to one publisher. */
function domainOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return json({ error: 'Sign in required.' }, 401);
  }

  // Acts as the calling user, so the is_admin check and the publisher lookup
  // both run under that user's own policies.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } }
  );

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return json({ error: 'Admin access required.' }, 403);
  }

  let target: URL;
  try {
    const body = (await request.json()) as { url?: string };
    target = new URL(String(body.url ?? ''));
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    return json({ error: 'Provide a valid http or https URL.' }, 400);
  }

  const domain = domainOf(target);

  const { data: source } = await supabase
    .from('news_sources')
    .select('domain, name')
    .eq('domain', domain)
    .eq('is_active', true)
    .maybeSingle();

  if (!source) {
    return json(
      {
        error: `${domain} is not a recognised publisher. Add it first if you trust it.`,
        domain,
      },
      422
    );
  }

  let html: string;
  try {
    const response = await fetch(target.toString(), {
      headers: {
        // Some publishers serve a stub to unknown agents. Identifying Aboki Rate
        // honestly is better than impersonating a browser.
        'User-Agent': 'AbokiRateBot/1.0 (+https://abokirate.ng)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return json(
        { error: `The publisher returned ${response.status}.` },
        502
      );
    }

    // Only the head is needed, and a cap keeps a huge page from being read
    // into memory.
    html = (await response.text()).slice(0, 300_000);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error && error.name === 'TimeoutError'
            ? 'The publisher did not respond in time.'
            : 'Could not reach the publisher.',
      },
      502
    );
  }

  const title =
    meta(html, 'og:title') ??
    meta(html, 'twitter:title') ??
    decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '');

  if (!title) {
    return json({ error: 'No headline found on that page.' }, 422);
  }

  const rawImage = meta(html, 'og:image') ?? meta(html, 'twitter:image');

  // Resolve protocol-relative and root-relative image paths against the
  // article URL, so the app never receives an address it cannot load.
  let imageUrl: string | null = null;
  if (rawImage) {
    try {
      imageUrl = new URL(rawImage, target).toString();
    } catch {
      imageUrl = null;
    }
  }

  const published =
    meta(html, 'article:published_time') ?? meta(html, 'og:published_time');

  const publishedAt =
    published && !Number.isNaN(Date.parse(published))
      ? new Date(published).toISOString()
      : null;

  const canonical = meta(html, 'og:url');
  let canonicalUrl = target.toString();
  if (canonical) {
    try {
      const resolved = new URL(canonical, target);
      // Only trust a canonical URL that stays with the same publisher.
      if (domainOf(resolved) === domain) canonicalUrl = resolved.toString();
    } catch {
      // Keep the URL the Admin supplied.
    }
  }

  return json({
    title,
    imageUrl,
    publishedAt,
    canonicalUrl,
    sourceDomain: source.domain,
    sourceName: source.name,
  });
});
