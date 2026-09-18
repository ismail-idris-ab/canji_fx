import { describe, expect, it } from 'vitest';

import {
  capExcerpt,
  EXCERPT_LIMIT,
  groupKey,
  isRelevant,
  parseFeed,
} from './rss';

// Shaped after the real Nairametrics feed, including its CDATA and entities.
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <item>
    <title>Naira strengthens as CBN clears FX backlog</title>
    <link>https://nairametrics.com/2026/09/17/naira-strengthens/</link>
    <dc:creator><![CDATA[Samuel Daniel]]></dc:creator>
    <pubDate>Thu, 17 Sep 2026 20:10:52 +0000</pubDate>
    <description><![CDATA[<p>The naira gained ground against the dollar after the apex bank settled outstanding obligations.</p>]]></description>
  </item>
  <item>
    <title>King Charles asks AI executives to consider risks</title>
    <link>https://nairametrics.com/2026/09/17/king-charles-ai/</link>
    <pubDate>Thu, 17 Sep 2026 19:00:00 +0000</pubDate>
    <description>A discussion about artificial intelligence safety.</description>
  </item>
</channel>
</rss>`;

describe('parsing a feed', () => {
  it('reads headline, link, excerpt and date', () => {
    const items = parseFeed(FEED);

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Naira strengthens as CBN clears FX backlog');
    expect(items[0].url).toBe(
      'https://nairametrics.com/2026/09/17/naira-strengthens/'
    );
    expect(items[0].publishedAt).toBe('2026-09-17T20:10:52.000Z');
  });

  it('strips CDATA and HTML out of the excerpt', () => {
    expect(parseFeed(FEED)[0].excerpt).toBe(
      'The naira gained ground against the dollar after the apex bank settled outstanding obligations.'
    );
  });

  it('never reads content:encoded, even when present', () => {
    // Some publishers put the whole article there. Taking it would make this
    // a mirror of their work rather than an index pointing at it.
    const withFullText = FEED.replace(
      '</description>',
      `</description><content:encoded><![CDATA[${'the entire article '.repeat(200)}]]></content:encoded>`
    );

    const excerpt = parseFeed(withFullText)[0].excerpt ?? '';

    expect(excerpt).not.toContain('the entire article');
    expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_LIMIT + 1);
  });

  it('skips an item with no title or no link', () => {
    const broken = `<rss><channel><item><title>Orphan</title></item></channel></rss>`;
    expect(parseFeed(broken)).toEqual([]);
  });

  it('skips a link that is not http', () => {
    const odd = `<rss><channel><item><title>T</title><link>javascript:alert(1)</link></item></channel></rss>`;
    expect(parseFeed(odd)).toEqual([]);
  });

  it('returns nothing for a page that is not a feed', () => {
    // TheCable answers a declared bot with an HTML 403 page.
    expect(parseFeed('<html><body>Forbidden</body></html>')).toEqual([]);
    expect(parseFeed('')).toEqual([]);
  });

  it('tolerates a missing or unparseable date', () => {
    const undated = `<rss><channel><item><title>T</title><link>https://x.ng/a</link><pubDate>whenever</pubDate></item></channel></rss>`;
    expect(parseFeed(undated)[0].publishedAt).toBeNull();
  });
});

describe('capping an excerpt', () => {
  it('leaves a short excerpt alone', () => {
    expect(capExcerpt('Short enough.')).toBe('Short enough.');
  });

  it('truncates on a word boundary and marks the cut', () => {
    const capped = capExcerpt('word '.repeat(100))!;

    expect(capped.length).toBeLessThanOrEqual(EXCERPT_LIMIT + 1);
    expect(capped.endsWith('…')).toBe(true);
    expect(capped).not.toMatch(/wor…$/);
  });

  it('caps by our limit, not the publisher’s', () => {
    // The whole point: a publisher can put an article in this field tomorrow.
    expect(capExcerpt('x'.repeat(5000))!.length).toBeLessThanOrEqual(
      EXCERPT_LIMIT + 1
    );
  });

  it('is null when there is nothing left after cleaning', () => {
    expect(capExcerpt('<p></p>')).toBeNull();
    expect(capExcerpt('   ')).toBeNull();
  });
});

describe('deciding what is worth a glance', () => {
  it('keeps an FX story', () => {
    expect(isRelevant(parseFeed(FEED)[0])).toBe(true);
  });

  it('drops one that is plainly unrelated', () => {
    expect(isRelevant(parseFeed(FEED)[1])).toBe(false);
  });

  it('matches on the excerpt, not only the headline', () => {
    // A headline can be oblique where the first line is explicit.
    expect(
      isRelevant({
        title: 'Traders brace for a difficult week',
        url: 'https://x.ng/a',
        excerpt: 'Pressure on the naira continued at the parallel market.',
        publishedAt: null,
      })
    ).toBe(true);
  });

  it('is case insensitive', () => {
    expect(
      isRelevant({
        title: 'CBN AND THE NAIRA',
        url: 'https://x.ng/a',
        excerpt: null,
        publishedAt: null,
      })
    ).toBe(true);
  });
});

describe('grouping near-identical headlines', () => {
  it('gives two outlets covering one story the same key', () => {
    // Not duplication to discard — sometimes the second write-up is better.
    // Grouping lets the Admin choose at a glance.
    const a = groupKey('CBN clears FX backlog as naira strengthens');
    const b = groupKey('Naira strengthens after CBN clears FX backlog');

    expect(a).toBe(b);
  });

  it('separates genuinely different stories', () => {
    expect(groupKey('CBN clears FX backlog')).not.toBe(
      groupKey('Dangote refinery raises petrol price')
    );
  });
});

describe('decoding entities', () => {
  it('decodes numeric entities, which Nigerian publishers emit constantly', () => {
    // Seen live: "Sanusi: I Was Wrong to Delay Telcos&#8217; Entry".
    const feed = `<rss><channel><item><title>Telcos&#8217; entry into naira market</title><link>https://x.ng/a</link></item></channel></rss>`;

    expect(parseFeed(feed)[0].title).toBe('Telcos’ entry into naira market');
  });

  it('decodes hexadecimal entities too', () => {
    const feed = `<rss><channel><item><title>CBN&#x2019;s naira policy</title><link>https://x.ng/a</link></item></channel></rss>`;

    expect(parseFeed(feed)[0].title).toBe('CBN’s naira policy');
  });

  it('does not double-decode an ampersand', () => {
    const feed = `<rss><channel><item><title>Naira &amp;amp; dollar</title><link>https://x.ng/a</link></item></channel></rss>`;

    expect(parseFeed(feed)[0].title).toBe('Naira &amp; dollar');
  });
});
