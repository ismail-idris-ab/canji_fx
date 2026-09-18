# Articles are rendered inside the app

Tapping a story shows its text in Aboki Rate's own typography rather than opening the publisher's site. This is republishing, and it is a deliberate reversal of the original design, in which the app was strictly an index.

## What was traded away

The PRD placed "no republished article text" under legal non-goals rather than scope, alongside the rules that keep this an information service. ADR 0007 had already moved the line once, to a 200-character excerpt, on the reasoning that a feed's description is published for syndication. This goes considerably further: the whole article, with the publisher's advertising absent.

The builder chose this with the objection stated, wanting readers to stay in the app. Recorded here so it reads as a decision rather than a drift.

## What keeps it as defensible as it can be

**The publisher is named everywhere.** Under the headline in the list, under the headline on the article, in a line at the foot saying the reporting is theirs, and on a button that opens their site. The reference app that prompted this change bylines every story to itself; that was rejected. Rendering someone's work without their name is passing off, which turns a copyright question into a reputational one.

**Sharing sends their URL.** Anyone receiving a shared story lands on the publisher, not here.

**Nothing is stored.** The article is fetched when a Reader asks and kept nowhere. Their words never sit in this database, Readers always get the current version including corrections, and honouring an objection needs no deletion.

**A per-publisher switch.** `news_sources.full_text` set false stops in-app rendering for that outlet immediately, without a deploy — the same shape as `rss_url` being nullable.

**A paywall stays a paywall.** Extraction yielding fewer than 120 words is treated as failure, and the story opens on the publisher's own page in an in-app browser instead. That covers metered articles and layouts the extractor cannot read, and means the app never presents a teaser as though it were the story.

**The function cannot be pointed anywhere else.** It accepts a news item id, not a URL, and reads that item's link from the database under the Reader's own policies. A function that fetches whatever address a caller supplies is an open proxy; this one can only reach stories an Admin already approved.

## The risk that remains

Rendering a publisher's reporting without their advertising removes their revenue from their own work. Attribution mitigates the appearance of the problem but not its substance. If an outlet objects, the answer is to set their flag false the same day — and to accept that the objection is reasonable.

If this ever needs reversing, the mechanism is already in place: set `full_text` false for every publisher, and every story opens on their own site instead. No code change.
