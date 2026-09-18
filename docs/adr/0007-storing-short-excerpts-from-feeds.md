# Short excerpts from publisher feeds are stored

News items now carry a capped excerpt taken from a feed's `<description>`. The PRD stated plainly that Aboki Rate never stores article text, so this amends that.

## Why it is defensible

A feed's description is published expressly for syndication. Every RSS reader ever written displays it, and publishers who did not want it shown would not emit a feed. Measured against the real Nairametrics feed, descriptions run 248 to 634 characters — a lede, not an article.

Without an image on the card, the excerpt is doing the work the picture used to: telling a Reader whether a story is worth leaving the app for. A bare headline makes that judgement harder, which means more pointless visits to the publisher rather than fewer.

## The two limits that keep this an index

**The cap is ours, not the publisher's.** 200 characters, truncated on a word boundary. The field belongs to the publisher and they may put an entire article in it tomorrow; a limit inherited from the feed would inherit that change silently.

**`<content:encoded>` is never read.** Some feeds carry the whole article there. Taking it would make this a mirror of somebody's work rather than an index pointing at it, and that is the line the product's copyright posture rests on. A test asserts the parser ignores that element even when it is present and large.

Every card still names its publisher and opens the original in the system browser, so the excerpt leads to the publisher rather than substituting for them.

## Consequences

The database now holds other people's words, where before it held only headlines and links. That is a real change in kind, not just degree, and it is why this is recorded rather than done quietly.

If a publisher objects, the remedy is per publisher: set their `rss_url` to null and they become manual-link-only, or remove them entirely. No code change is needed.

The 200-character cap lives in one constant in the shared `rss` module, used by both the app and the Edge Function, so it cannot drift between what is stored and what is shown.
