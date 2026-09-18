import { describe, expect, it } from 'vitest';

import { extractArticle, isReadable, MIN_WORDS } from './article';

const SENTENCE =
  'Nigeria traded far more with the rest of Africa than it bought from the continent during the quarter under review. ';

function body(times: number): string {
  return `<p>${SENTENCE.repeat(times)}</p>`;
}

const PAGE = `
<html><head><title>x</title><style>.a{color:red}</style></head>
<body>
  <header><nav><ul><li><a href="/">Home</a></li><li><a href="/fx">FX</a></li></ul></nav></header>
  <article>
    <h1>Nigeria Records N5.54tn Trade Gap With Africa</h1>
    <p>Nigeria's trade with African countries reached about N7.76 trillion in the second quarter of 2026, the National Bureau of Statistics has said.</p>
    <h2>Top African export destinations</h2>
    <p>Togo received the largest share of Nigerian exports at about N1.50 trillion, while South Africa followed with N1.34 trillion in the same period.</p>
    <ul>
      <li>Togo took the largest share of exports during the quarter</li>
      <li>South Africa followed closely behind in second place</li>
      <li>FX</li>
    </ul>
    <p>Share this</p>
    <p>Advertisement</p>
    ${body(4)}
  </article>
  <aside><p>Related stories you may also enjoy reading on our website today</p></aside>
  <footer><p>Copyright 2026 all rights reserved by the publisher</p></footer>
</body></html>`;

describe('extracting an article', () => {
  const result = extractArticle(PAGE);

  it('keeps paragraphs in document order', () => {
    const paragraphs = result.blocks.filter((b) => b.type === 'paragraph');
    expect(paragraphs[0].text).toContain('N7.76 trillion');
  });

  it('preserves headings rather than flattening to a wall of text', () => {
    expect(result.blocks).toContainEqual({
      type: 'heading',
      text: 'Top African export destinations',
    });
  });

  it('keeps the heading attached to what follows it', () => {
    const headingAt = result.blocks.findIndex((b) => b.type === 'heading');
    expect(result.blocks[headingAt + 1].type).toBe('paragraph');
  });

  it('keeps real list items', () => {
    expect(result.blocks).toContainEqual({
      type: 'listItem',
      text: 'Togo took the largest share of exports during the quarter',
    });
  });

  it('drops navigation dressed as a list', () => {
    // A one-word <li> is a menu, not reporting.
    expect(result.blocks.some((b) => b.text === 'FX')).toBe(false);
    expect(result.blocks.some((b) => b.text === 'Home')).toBe(false);
  });

  it('drops furniture', () => {
    const texts = result.blocks.map((b) => b.text.toLowerCase());
    expect(texts.some((t) => t.startsWith('share this'))).toBe(false);
    expect(texts.some((t) => t.startsWith('advertisement'))).toBe(false);
  });

  it('drops the footer and the related-stories rail', () => {
    const texts = result.blocks.map((b) => b.text.toLowerCase());
    expect(texts.some((t) => t.includes('all rights reserved'))).toBe(false);
    expect(texts.some((t) => t.startsWith('related'))).toBe(false);
  });

  it('never emits script or style contents', () => {
    expect(result.blocks.some((b) => b.text.includes('color:red'))).toBe(false);
  });
});

describe('judging whether extraction worked', () => {
  it('accepts a full article', () => {
    expect(isReadable(extractArticle(PAGE))).toBe(true);
  });

  it('rejects a teaser, so a paywall is not shown as the story', () => {
    // A metered article typically yields one paragraph and a subscribe
    // prompt. Rendering that as though it were the article would
    // misrepresent both the publisher and the piece.
    const teaser = `<html><body><article><p>${SENTENCE}</p><p>Subscribe to continue reading</p></article></body></html>`;

    const result = extractArticle(teaser);
    expect(result.wordCount).toBeLessThan(MIN_WORDS);
    expect(isReadable(result)).toBe(false);
  });

  it('rejects an empty or non-HTML response', () => {
    expect(isReadable(extractArticle(''))).toBe(false);
    expect(isReadable(extractArticle('not html at all'))).toBe(false);
  });

  it('does not end on a dangling heading', () => {
    // A heading with nothing after it advertises content that was not
    // extracted, which reads as breakage rather than as an article.
    const trailing = `<html><body><article>${body(5)}<h2>What happens next</h2></article></body></html>`;

    const blocks = extractArticle(trailing).blocks;
    expect(blocks[blocks.length - 1].type).not.toBe('heading');
  });
});

describe('entity handling', () => {
  it('decodes numeric entities in body text', () => {
    const page = `<html><body><article><p>${SENTENCE}</p><p>The bank&#8217;s position on the naira was unchanged throughout the whole of the quarter.</p>${body(3)}</article></body></html>`;

    const joined = extractArticle(page)
      .blocks.map((b) => b.text)
      .join(' ');

    expect(joined).toContain('bank’s position');
    expect(joined).not.toContain('&#8217;');
  });
});

describe('pages with no semantic article element', () => {
  // ThisDay's real pages have no <article>, so the whole document was being
  // scanned and the date rail, section links and a headline from a different
  // story all came through.
  const RAILED = `<html><body>
    <div class="rail"><ul>
      <li>Thursday, 17th September, 2026</li>
      <li>Rest of the World</li>
    </ul></div>
    <h2>Orire Kidnap: Victim Recounts 56 Days in Captivity</h2>
    <div class="entry-content">
      <p>Nigeria's trade with African countries reached about N7.76 trillion in the second quarter of 2026, the National Bureau of Statistics has said.</p>
      <h2>Top African export destinations</h2>
      <p>Togo received the largest share of Nigerian exports at about N1.50 trillion, while South Africa followed with N1.34 trillion in the period.</p>
      <p>Energy products drove the bulk of those shipments across the continent during the quarter under review by the statistics agency.</p>
    </div>
    <footer><p>Copyright 2026 all rights reserved</p></footer>
  </body></html>`;

  const result = extractArticle(RAILED);

  it('drops the date rail', () => {
    expect(result.blocks.some((b) => b.text.includes('Thursday'))).toBe(false);
  });

  it('drops section links', () => {
    expect(result.blocks.some((b) => b.text === 'Rest of the World')).toBe(false);
  });

  it('drops a headline belonging to another story', () => {
    expect(result.blocks.some((b) => b.text.includes('Orire Kidnap'))).toBe(
      false
    );
  });

  it('opens on the article\u2019s first paragraph', () => {
    expect(result.blocks[0].type).toBe('paragraph');
    expect(result.blocks[0].text).toContain('N7.76 trillion');
  });

  it('still keeps the article\u2019s own heading', () => {
    expect(result.blocks).toContainEqual({
      type: 'heading',
      text: 'Top African export destinations',
    });
  });
});

describe('publishers who do not use semantic markup', () => {
  it('splits a paragraph that uses double line breaks', () => {
    // One ThisDay story came back as six paragraphs, one of them 370 words,
    // because the whole article sat in a single <p> divided by <br><br>.
    const page = `<html><body><article><p>
      Nigeria's trade with African countries reached about N7.76 trillion in the second quarter of the year.<br><br>
      Togo received the largest share of Nigerian exports at about N1.50 trillion during the same quarter.<br /><br />
      Energy products drove the bulk of those shipments across the continent throughout the period reviewed.
    </p></article></body></html>`;

    const blocks = extractArticle(page).blocks;

    expect(blocks).toHaveLength(3);
    expect(blocks[0].text).toContain('N7.76 trillion');
    expect(blocks[1].text).toContain('Togo');
    expect(blocks[2].text).toContain('Energy products');
  });

  it('does not split on a single line break', () => {
    // A lone <br> is a line wrap inside one paragraph, not a new one.
    const page = `<html><body><article><p>Nigeria traded far more with the rest of Africa<br>than it bought from the continent during the quarter under review here.</p>${body(4)}</article></body></html>`;

    const first = extractArticle(page).blocks[0];
    expect(first.text).toContain('than it bought');
  });

  it('treats a short bold paragraph as a subheading', () => {
    // Both real articles examined had no <h2> at all; their subheadings were
    // marked with <strong>, which is why the reading view had no structure.
    const page = `<html><body><article>${body(3)}<p><strong>Top African export destinations</strong></p><p>Togo received the largest share of Nigerian exports at about N1.50 trillion during the quarter.</p></article></body></html>`;

    expect(extractArticle(page).blocks).toContainEqual({
      type: 'heading',
      text: 'Top African export destinations',
    });
  });

  it('does not mistake a bold sentence for a subheading', () => {
    // Emphasis inside prose is not structure. A full sentence stays a
    // paragraph even when a publisher bolds the whole of it.
    const page = `<html><body><article>${body(3)}<p><strong>The naira closed weaker against the dollar on Thursday afternoon in Lagos trading.</strong></p></article></body></html>`;

    const bolded = extractArticle(page).blocks.find((b) =>
      b.text.includes('closed weaker')
    );

    expect(bolded?.type).toBe('paragraph');
  });
});

describe('publishers who separate paragraphs with a single break', () => {
  it('splits where a single break follows a finished sentence', () => {
    // ThisDay's real pages put one <br> between every paragraph, which is
    // why a 370-word block was reaching the reading view as one lump.
    const page = `<html><body><article><p>Nigeria's trade with African countries reached about N7.76 trillion in the quarter.<br>Togo received the largest share of Nigerian exports at about N1.50 trillion overall.<br>Energy products drove the bulk of those shipments across the whole continent.</p></article></body></html>`;

    const blocks = extractArticle(page).blocks;

    expect(blocks).toHaveLength(3);
    expect(blocks[1].text).toContain('Togo');
  });

  it('keeps a wrapped line joined to its own sentence', () => {
    const page = `<html><body><article><p>Nigeria traded far more with the rest of Africa<br>than it bought from the continent during the quarter under review.</p>${body(4)}</article></body></html>`;

    const first = extractArticle(page).blocks[0];

    expect(first.text).toContain('rest of Africa than it bought');
  });

  it('splits on a run of breaks regardless of punctuation', () => {
    const page = `<html><body><article><p>Nigeria traded more with the rest of Africa than before<br><br>Togo received the largest share of Nigerian exports during the quarter.</p>${body(3)}</article></body></html>`;

    const blocks = extractArticle(page).blocks;

    expect(blocks[0].text).not.toContain('Togo');
  });
});
