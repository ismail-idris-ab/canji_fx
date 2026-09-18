/**
 * Reading an RSS feed into candidate news items.
 *
 * Pure: no network, no clock, no database. Feeds are other people's XML and
 * vary more than their specification suggests, so every decision about what
 * is acceptable lives here where it can be tested against real shapes.
 */

export type FeedItem = {
  title: string;
  url: string;
  /** Capped excerpt, or null when the feed gave nothing usable. */
  excerpt: string | null;
  publishedAt: string | null;
};

/**
 * Our cap, not the publisher's.
 *
 * Feeds carry a description expressly for syndication and every reader
 * application displays it. But the field belongs to the publisher, who may
 * put an entire article in it tomorrow — so the limit has to be ours. See
 * ADR 0007.
 */
export const EXCERPT_LIMIT = 200;

/**
 * Terms that make an item worth an Admin's glance.
 *
 * Deliberately loose. A whole-publication feed is roughly 85% irrelevant to
 * this app — the top Nairametrics item when this was written was about King
 * Charles and AI — but a filter that silently drops the story that mattered
 * is worse than one that shows a few extras. It saves scrolling; it does not
 * decide.
 */
export const FX_TERMS = [
  'naira',
  'forex',
  'fx',
  'exchange rate',
  'cbn',
  'central bank',
  'dollar',
  'devaluation',
  'remittance',
  'bureau de change',
  'bdc',
  'parallel market',
];

/**
 * Decodes entities.
 *
 * Numeric forms are handled generally rather than by a list of the ones
 * anyone happened to notice. Nigerian publishers emit `&#8217;` for a
 * curly apostrophe constantly, and a headline reading "Telcos&#8217; Entry"
 * on screen looks broken in a way that undermines a product whose whole
 * claim is care with detail.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
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
    // Ampersand last, so an already-decoded entity is not re-decoded.
    .replace(/&amp;/g, '&');
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

/**
 * Unwrap, decode once, then strip markup.
 *
 * Exactly one decode pass: decoding twice would turn `&amp;amp;` — which is
 * a publisher writing a literal `&amp;` — into a bare ampersand, silently
 * altering their words. Decoding before stripping handles the publishers who
 * escape their HTML rather than wrapping it in CDATA.
 */
function tidy(value: string): string {
  return stripTags(decodeEntities(value)).replace(/\s+/g, ' ').trim();
}

/** Reads one element's contents, tolerating attributes and newlines. */
function element(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  );
  return match ? match[1] : null;
}

/**
 * Truncates on a word boundary so an excerpt never ends mid-word.
 *
 * The ellipsis signals plainly that there is more, which is the point: the
 * excerpt exists to help someone decide whether to visit the publisher, not
 * to substitute for doing so.
 */
export function capExcerpt(text: string, limit = EXCERPT_LIMIT): string | null {
  const clean = tidy(text);
  if (clean.length === 0) return null;
  if (clean.length <= limit) return clean;

  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function isRelevant(item: FeedItem, terms = FX_TERMS): boolean {
  const haystack = `${item.title} ${item.excerpt ?? ''}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

/**
 * Parses a feed.
 *
 * `content:encoded` is never read. Some publishers put entire articles there,
 * and taking it would make this a mirror of their work rather than an index
 * pointing at it.
 */
export function parseFeed(xml: string): FeedItem[] {
  if (typeof xml !== 'string' || !/<(rss|feed)[\s>]/i.test(xml)) return [];

  const chunks = xml.split(/<item(?:\s[^>]*)?>/i).slice(1);
  const items: FeedItem[] = [];

  for (const chunk of chunks) {
    const body = chunk.split(/<\/item>/i)[0];

    const rawTitle = element(body, 'title');
    const rawLink = element(body, 'link');
    if (!rawTitle || !rawLink) continue;

    const title = tidy(rawTitle);
    const url = tidy(rawLink);

    if (!title || !/^https?:\/\//.test(url)) continue;

    const rawDescription = element(body, 'description');
    const rawDate = element(body, 'pubDate') ?? element(body, 'dc:date');

    const parsedDate = rawDate ? Date.parse(tidy(rawDate)) : Number.NaN;

    items.push({
      title,
      url,
      excerpt: rawDescription ? capExcerpt(rawDescription) : null,
      publishedAt: Number.isNaN(parsedDate)
        ? null
        : new Date(parsedDate).toISOString(),
    });
  }

  return items;
}

/**
 * Groups items whose headlines are near-identical.
 *
 * Five publishers will cover one CBN announcement within the hour. That is
 * not duplication to be discarded — sometimes the better write-up is the
 * second one — so near-matches are marked rather than dropped, and the
 * choice stays with the Admin.
 */
/**
 * Common words that survive a length filter but carry no meaning, so two
 * headlines about one event are not separated by whichever connective each
 * subeditor happened to choose.
 */
const STOPWORDS = new Set([
  'after', 'amid', 'been', 'from', 'have', 'into', 'more', 'over', 'says',
  'than', 'that', 'this', 'what', 'when', 'will', 'with', 'about', 'against',
  'ahead', 'could', 'while', 'their', 'there', 'these', 'those',
]);

export function groupKey(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  // Sorted before slicing, not after: taking the first six as written would
  // make the key depend on word order, and two outlets reporting the same
  // event rarely order it the same way.
  return [...new Set(words)].sort().slice(0, 6).join('-');
}
