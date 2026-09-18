// GENERATED FILE — do not edit.
// Synced from src/domain/article.ts by `npm run sync:functions`.
// The source of truth lives there because that is where its tests run.

/**
 * Turning a publisher's HTML into readable blocks.
 *
 * Pure, so the awkward part — deciding what on a page is the article and what
 * is navigation, advertising and "related stories" — is testable against real
 * page shapes rather than discovered on a device.
 *
 * Structure is preserved rather than flattened. A wall of paragraphs is
 * harder to read than the original, which would defeat the point of rendering
 * it here at all.
 */

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'listItem'; text: string };

export type Extraction = {
  blocks: Block[];
  /** Words across all blocks — the signal used to judge whether this worked. */
  wordCount: number;
};

/**
 * Below this, assume extraction failed and fall back to the publisher's own
 * page in an in-app browser. A paywalled or heavily scripted article often
 * yields a teaser paragraph and nothing else, and showing that as though it
 * were the story would misrepresent both the publisher and the article.
 */
export const MIN_WORDS = 120;

/** Elements whose contents are never part of the article. */
const NOISE = [
  'script', 'style', 'noscript', 'template', 'svg', 'iframe', 'form',
  'header', 'footer', 'nav', 'aside', 'figure', 'figcaption', 'button',
];

/**
 * Lines that are furniture rather than reporting. Nigerian outlets carry
 * most of these verbatim.
 */
const FURNITURE =
  /^(advertisement|sponsored|related|read also|also read|share this|follow us|tags?:|copyright|all rights reserved|leave a reply|comments?|subscribe|sign up|download our app|join our|whatsapp channel|telegram)/i;

function stripNoise(html: string): string {
  let out = html;

  for (const tag of NOISE) {
    out = out.replace(
      new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi'),
      ' '
    );
    out = out.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), ' ');
  }

  return out.replace(/<!--[\s\S]*?-->/g, ' ');
}

function decodeEntities(value: string): string {
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

/**
 * Splits a block on double line breaks.
 *
 * Several Nigerian publishers separate paragraphs with <br><br> inside one
 * <p> rather than with separate elements. Stripping tags first collapses an
 * entire story into a single wall of text — one ThisDay article came back as
 * six paragraphs, one of them 370 words.
 */
function splitOnBreaks(html: string): string[] {
  // A run of two or more breaks is always a paragraph boundary, so those are
  // split first and never rejoined.
  const hardParts = html
    .split(/(?:<br\s*\/?>\s*){2,}/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];

  for (const hardPart of hardParts) {
    // A single break is ambiguous. ThisDay separates every paragraph with
    // one <br>, while other publishers use it to wrap a line mid-sentence.
    // Terminal punctuation tells them apart: a wrapped line does not end in
    // a full stop.
    const fragments = hardPart
      .split(/<br\s*\/?>/i)
      .map((part) => part.trim())
      .filter(Boolean);

    let current = '';

    for (const fragment of fragments) {
      if (!current) {
        current = fragment;
        continue;
      }

      const plain = current.replace(/<[^>]+>/g, ' ').trim();

      if (/[.!?”"']$/.test(plain)) {
        paragraphs.push(current);
        current = fragment;
      } else {
        current = `${current} ${fragment}`;
      }
    }

    if (current) paragraphs.push(current);
  }

  return paragraphs;
}

/**
 * A paragraph that is entirely bold and short is a subheading the publisher
 * marked with <strong> instead of <h2>. Both ThisDay articles examined had
 * no <h2> at all, which is why the reading view had no structure.
 */
function isPseudoHeading(inner: string, content: string): boolean {
  const withoutBold = inner.replace(/<\/?(?:strong|b)(?:\s[^>]*)?>/gi, '');
  const bare = withoutBold.replace(/<[^>]+>/g, '').trim();

  const wasBold = /<(?:strong|b)(?:\s[^>]*)?>/i.test(inner);
  const words = content.split(' ').length;

  // Bold, the whole block, short, and not a sentence.
  return (
    wasBold &&
    bare.length > 0 &&
    words >= 2 &&
    words <= 12 &&
    !/[.!?]$/.test(content)
  );
}

function text(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Narrows to the part of the page holding the article.
 *
 * Prefers a semantic container where the publisher provided one; otherwise
 * takes the block with the most paragraph text, which is a crude measure that
 * happens to be right far more often than any rule about class names.
 */
function narrow(html: string): string {
  const semantic = html.match(/<article[\s>][\s\S]*?<\/article>/i);
  if (semantic && countWords(semantic[0]) > MIN_WORDS) return semantic[0];

  // Publishers who use no semantic element almost always name the container.
  // Without this, a page like ThisDay's yields the whole document, and the
  // extraction picks up the date rail, section links and headlines belonging
  // to entirely different stories.
  const named = html.match(
    /<div[^>]*class="[^"]*(?:entry-content|post-content|article-content|article-body|story-content|entry__content|post-body)[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?:<\/div>|<\/section>|<footer|<aside)/i
  );
  if (named && countWords(named[0]) > MIN_WORDS) return named[0];

  const main = html.match(/<main[\s>][\s\S]*?<\/main>/i);
  if (main && countWords(main[0]) > MIN_WORDS) return main[0];

  return html;
}

/** Dates, section names and other rail furniture that survives as a list. */
const RAIL =
  /^(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|\d{1,2}(?:st|nd|rd|th)?\s|rest of the world$|home$|news$|business$|politics$|sport)/i;

function countWords(html: string): number {
  const paragraphs = html.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? [];
  return paragraphs.reduce(
    (total, paragraph) => total + text(paragraph).split(' ').filter(Boolean).length,
    0
  );
}

export function extractArticle(html: string): Extraction {
  if (typeof html !== 'string' || html.length === 0) {
    return { blocks: [], wordCount: 0 };
  }

  const body = narrow(stripNoise(html));
  const blocks: Block[] = [];

  // One pass in document order, so headings stay attached to the paragraphs
  // they introduce.
  // The optional attribute group is non-capturing, so group 2 is the inner
  // HTML and nothing else — reconstructing the tag around it would leave the
  // tag name in the extracted text.
  const pattern = /<(h2|h3|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const tag = match[1].toLowerCase();
    const content = text(match[2]);

    if (!content || FURNITURE.test(content)) continue;

    if (tag === 'h2' || tag === 'h3') {
      blocks.push({ type: 'heading', text: content });
      continue;
    }

    if (tag === 'p' && isPseudoHeading(match[2], content)) {
      blocks.push({ type: 'heading', text: content });
      continue;
    }

    if (tag === 'li') {
      // A navigation or date rail survives the noise filter surprisingly
      // often. Real list items in an article are sentences, not section
      // names or datelines.
      if (content.split(' ').length >= 6 && !RAIL.test(content)) {
        blocks.push({ type: 'listItem', text: content });
      }
      continue;
    }

    // One <p> can hold several paragraphs separated by line breaks.
    for (const part of splitOnBreaks(match[2])) {
      const paragraph = text(part);

      // Very short paragraphs are captions, bylines and share prompts far
      // more often than they are reporting.
      if (paragraph && paragraph.split(' ').length >= 6) {
        blocks.push({ type: 'paragraph', text: paragraph });
      }
    }
  }

  // An article opens with prose. Anything before the first paragraph is
  // page furniture that survived the filters — a dateline, a section link,
  // or a headline belonging to a different story in a sidebar.
  const firstParagraph = blocks.findIndex((block) => block.type === 'paragraph');
  const trimmed = firstParagraph > 0 ? blocks.slice(firstParagraph) : blocks;

  // A heading with nothing after it introduces content that was not
  // extracted, which reads as an error rather than an article.
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].type === 'heading') {
    trimmed.pop();
  }

  const wordCount = trimmed.reduce(
    (total, block) => total + block.text.split(' ').filter(Boolean).length,
    0
  );

  return { blocks: trimmed, wordCount };
}

/** Whether the extraction is good enough to show instead of the real page. */
export function isReadable(extraction: Extraction): boolean {
  return extraction.wordCount >= MIN_WORDS;
}
