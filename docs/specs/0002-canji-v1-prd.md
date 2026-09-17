# PRD — Canji v1

Vocabulary: see [CONTEXT.md](../../CONTEXT.md). Capitalised terms are defined there.

## Problem Statement

Nigerians who earn, spend, send or receive foreign currency have no trustworthy, fast way to know what a unit of foreign currency is worth in Naira right now.

Two numbers matter and they diverge. The Parallel Market rate is what a person actually transacts at on the street. The Official Market rate is what institutions publish. A reader needs both, and needs to know which is which.

Existing sources fail in specific ways. Some display a number with no indication of when it was observed, so a reader cannot tell this morning's rate from last Tuesday's. Some blend the two markets into a single figure that matches neither. Some are slow, advertisement-heavy web pages that are painful on a phone and unusable on a weak connection. And since the 2021 CBN action against AbokiFX, several sources have become cautious or opaque about where their numbers come from at all.

The reader's real question is not "what is the rate" but "can I trust this number, and how old is it". No existing source answers the second half of that question.

A second problem sits behind the first. Anyone publishing parallel rates in Nigeria must be visibly an observer of the market rather than a participant in it. A product that appears to set, offer or guarantee rates invites regulatory attention regardless of what it actually does. This constraint shapes the product surface, not just its terms of service.

## Solution

Canji is a mobile application that reports Nigerian foreign-exchange rates and is relentlessly explicit about their provenance and age.

For each Quoted Currency it shows two Markets. The Parallel Market figure is observed by the Admin several times a day and carries a Buy Rate and a Sell Rate. The Official Market figure is fetched automatically from the Central Bank of Nigeria's published data and carries a Buy Rate, Central Rate and Sell Rate. Every displayed Rate is accompanied by its Source, its Observed At time in WAT, and a Freshness indicator that tells the reader in one word how much confidence to place in it.

A converter turns an amount into the other currency using the side of the Spread that would actually apply to that direction, rather than a flattering midpoint. A Gap line shows the distance between the two Markets, and disappears rather than mislead when either side is Stale. A curated news list links out to FX coverage from recognised publishers without reproducing any of their text. Rate Alerts notify a Reader when a Rate crosses a threshold they chose.

The honesty is the product. Timestamps and Freshness are the most prominent elements on screen after the numbers themselves, and the application never displays a Rate without them.

## User Stories

### Reading rates

1. As a Reader, I want to see the current Parallel Market Buy Rate and Sell Rate for a Quoted Currency, so that I know what I would actually get or pay on the street.
2. As a Reader, I want to see the current Official Market rate for a Quoted Currency, so that I can compare the street against the institutional figure.
3. As a Reader, I want to switch between the Parallel Market and the Official Market with one tap, so that I can see either without leaving the screen.
4. As a Reader, I want each Rate labelled with its Source, so that I know who produced the number and that Canji did not invent it.
5. As a Reader, I want each Rate labelled with its Observed At time, so that I can judge whether it reflects the market as it is now.
6. As a Reader, I want Observed At shown in WAT regardless of where my phone thinks it is, so that I do not misjudge a rate's age while travelling.
7. As a Reader, I want a one-word Freshness indicator on each Rate, so that I do not have to do date arithmetic to know whether to trust it.
8. As a Reader, I want an Official Market Rate observed on Friday to still read as Fresh on Saturday, so that the application does not cry stale about a source that simply does not publish at weekends.
9. As a Reader, I want a Parallel Market Rate from four days ago to read as Stale, so that I am warned before I act on it.
10. As a Reader, I want to see the Rate Date of an Official Market Rate alongside when Canji observed it, so that I understand which trading day the figure belongs to.
11. As a Reader, I want new Rates to appear without pulling to refresh, so that a screen I left open does not quietly show me an old number.
12. As a Reader, I want to pull to refresh anyway, so that I can force a check when I do not trust what I am seeing.
13. As a Reader, I want the list of Quoted Currencies ordered with the ones I care about first, so that I am not scrolling to find the US dollar.
14. As a Reader, I want a short disclaimer stating that Rates are indicative and for information only, so that I understand what the application is and is not.
15. As a Reader, I want that disclaimer always visible rather than in a modal I dismiss once, so that the framing is present every time I look at a number.
16. As a Reader, I want to reach an About screen naming the Central Bank of Nigeria as the source of Official Market data, so that the attribution is discoverable.
17. As a Reader, I want to be told that displayed figures are rounded for readability, so that a small difference against another source does not read as an error.

### The Gap between markets

18. As a Reader, I want to see the Gap between the Parallel Market and the Official Market for a Quoted Currency, so that I can see how far the street is from the official figure.
19. As a Reader, I want the Gap shown in both Naira and percentage terms, so that I can grasp its size either way.
20. As a Reader, I want the Gap labelled with exactly which two numbers it compares, so that I am not guessing at the convention.
21. As a Reader, I want the Gap hidden entirely when either side is Stale, so that I never screenshot and share a number computed from a four-day-old observation.
22. As a Reader, I want a Quoted Currency with no Official Market counterpart to say so plainly, so that a missing Gap does not read as a defect.

### Converting

23. As a Reader, I want to convert an amount of a Quoted Currency into Naira, so that I can price something I am about to receive.
24. As a Reader, I want to convert an amount of Naira into a Quoted Currency, so that I can price something I am about to buy.
25. As a Reader, I want the conversion to use the side of the Spread that would actually apply to my direction, so that the answer is what I would really get rather than a flattering midpoint.
26. As a Reader, I want to see which side of the Spread was applied, so that I can check the arithmetic myself.
27. As a Reader, I want to convert using the Official Market as well, so that I can see the institutional equivalent of the same amount.
28. As a Reader, I want the Official Market conversion to use the Central Rate, so that it does not imply a retail counterparty that does not exist.
29. As a Reader, I want to reverse the direction of a conversion with one tap, so that I do not retype the amount.
30. As a Reader, I want the converter to carry the same Source, Observed At and Freshness labelling as the rates screen, so that a converted figure is no less accountable than a raw one.
31. As a Reader, I want to change which Quoted Currency I am converting without losing my entered amount, so that I can compare quickly.

### Weak connections and cold starts

32. As a Reader, I want the last Rates I saw to appear instantly when I open the application, so that I am not staring at a spinner on a bad connection.
33. As a Reader, I want cached Rates labelled with their original Observed At and Freshness, so that offline data is never mistaken for live data.
34. As a Reader, I want the application to still show me rates if anonymous sign-in fails, so that a shared or congested network does not lock me out of the core feature.
35. As a Reader, I want a clear message when there is no data and no cache, so that I know whether to retry or wait.
36. As a Reader, I want a clear message when a Quoted Currency has never had a Rate recorded, so that an empty row is explained rather than blank.

### News

37. As a Reader, I want a list of recent Nigerian FX news headlines, so that I can understand why a rate moved.
38. As a Reader, I want each headline to name its publisher, so that I can weigh the source.
39. As a Reader, I want tapping a headline to open the original article in my browser, so that the publisher receives the visit.
40. As a Reader, I want a headline image where one exists, so that the list is scannable.
41. As a Reader, I want the list to degrade gracefully when an image fails to load, so that a broken image does not break the card.

### Alerts

42. As a Reader, I want to create a Rate Alert for a Quoted Currency and Market, so that I do not have to keep checking the application.
43. As a Reader, I want to choose whether the alert fires above or below my threshold, so that it matches what I am waiting for.
44. As a Reader, I want to know which number the alert is watching, so that I am not surprised by which side of the Spread triggered it.
45. As a Reader, I want the alert to fire on the Crossing rather than every time it is checked, so that I receive one notification rather than a daily stream.
46. As a Reader, I want an alert to stop after it fires, so that a threshold behaves like a threshold.
47. As a Reader, I want to re-arm a fired alert in one tap from the notification, so that resetting it is not a chore.
48. As a Reader, I want to see and delete my active alerts, so that I can clear ones I no longer care about.
49. As a Reader, I want to be told when I have reached the limit on active alerts, so that a silently ignored creation does not leave me waiting for a notification that never arrives.
50. As a Reader, I want to use the whole application without ever granting notification permission, so that alerts are optional rather than a gate.
51. As a Reader, I want a clear explanation when I have denied notification permission and then try to create an alert, so that I know why it will not work.
52. As a Reader, I want alerts offered only for combinations that actually have Rates, so that I cannot create one that can never fire.

### Recording rates

53. As an Admin, I want to reach the rate-entry screen without it appearing in the tab bar, so that the application does not advertise an administrative surface to Readers.
54. As an Admin, I want to sign in with email and password, so that only I can record Rates.
55. As an Admin, I want a second authentication factor, so that a stolen phone is not sufficient to publish a false national rate.
56. As an Admin, I want to enter Buy and Sell for the four Tracked Currencies on one screen, so that a rate round takes well under a minute.
57. As an Admin, I want the current live value shown next to each input, so that I can see what I am changing it from.
58. As an Admin, I want a numeric keypad by default, so that I am not fighting the keyboard.
59. As an Admin, I want to be asked to confirm when a value I typed is far from the last one, so that a slipped digit does not become a national rate.
60. As an Admin, I want my entry rejected when the Sell Rate is below the Buy Rate, so that an inverted Spread never reaches Readers.
61. As an Admin, I want to correct a mistake by recording a new observation, so that the history of what was shown remains intact.
62. As an Admin, I want each Rate I record attributed to me, so that there is an audit trail.
63. As an Admin, I want the Source stated on every Rate I record without typing it, so that the legal framing cannot drift.
64. As an Admin, I want to record an Official Market Rate by hand, so that a broken automatic fetch does not leave the application without an official figure.
65. As an Admin, I want signing in to end any anonymous session on the device, so that my Admin identity and my Reader identity do not entangle.

### Curating news

66. As an Admin, I want to paste an article URL and have its headline, image and publisher extracted for me, so that adding a story takes seconds.
67. As an Admin, I want to review what was extracted before it goes live, so that a bad headline does not reach Readers.
68. As an Admin, I want URLs from unrecognised publishers rejected, so that attribution stays consistent.
69. As an Admin, I want to add a new recognised publisher from my phone, so that a breaking story on an unlisted site is not blocked until I reach a computer.
70. As an Admin, I want to deactivate a News Item, so that I can remove something that turned out to be wrong.
71. As an Admin, I want to control the order of News Items, so that the most important story is at the top.

### Operating the system

72. As an Admin, I want Official Market Rates fetched automatically on weekdays, so that I do not have to enter them.
73. As an Admin, I want a repeated fetch of an unchanged figure not to create a new Rate, so that history is not flooded with duplicates.
74. As an Admin, I want to be notified when the upstream source changes shape, so that I learn about a break from the system rather than from a user.
75. As an Admin, I want to be notified when no Official Market Rate has arrived for today by mid-morning on a weekday, so that a silent failure that still returns data is caught.
76. As an Admin, I want an unrecognised currency label from the upstream source logged rather than guessed at, so that a mislabelled currency never reaches a Reader.
77. As an Admin, I want to be told when the primary source is unreachable, and whether a second source can still be reached, so that I know to enter official rates by hand rather than discovering the gap later.
78. As an Admin, I want alerts evaluated only against Rates that have settled for a few minutes, so that a typo I correct quickly never becomes a push notification.
79. As an Admin, I want push tokens that are no longer valid to deactivate their alerts, so that the notification list does not rot.
80. As an Admin, I want abandoned anonymous accounts cleaned up periodically, so that the user table does not grow without bound.

## Module Design

The architecture is three deep, pure modules wrapped in thin shells. Each pure module hides a substantial amount of domain logic behind a small interface that should rarely change. None of them import a Supabase client, React, or a networking library, and none read the clock — the current instant is always an argument. That property is what makes them testable without mocks.

### Rate Book (deep, pure)

The single object the entire user interface asks questions of. Constructed from a collection of Rates and a current instant; answers everything a screen needs.

Its interface is roughly: give me the latest Rate for a Quoted Currency in a Market; give me its Freshness; give me the Gap for this Quoted Currency; convert this amount in this direction.

Behind that small surface it hides: selection of the newest observation per pair under append-only storage, two entirely different Freshness rules (elapsed hours for the Parallel Market, publication days for the Official Market), the Gap convention and its suppression rules, and the choice of which side of the Spread applies to a conversion direction. Every one of those is a decision a caller could get wrong, and none of them is exposed.

This module is the reason the application can be trusted. It is also the reason the same logic cannot drift between the rates screen, the converter, and the alert checker — they all ask the same object.

### Upstream Feed (deep, pure)

Turns a raw upstream payload into Rates, or into a description of why it could not.

Interface: parse this payload, return the Rates it contains plus any labels that could not be mapped. Separately: given these parsed Rates and what is already stored, tell me which are new.

It hides shape validation, label normalisation, the mapping from upstream labels to currency codes, date parsing across two different upstream date formats, exclusion of non-consumer units, and the dedupe rule. The Edge Function that uses it performs only I/O — fetch, call, insert, report.

### Alert Engine (deep, pure)

Interface: given these alerts, this Rate Book and this instant, tell me which should fire and how each should be updated.

It hides Crossing detection against the last seen Rate, selection of the Watched Side, the settle delay that ignores Rates younger than a few minutes, and the deactivate-after-firing rule. It returns descriptions of what should happen; it never sends anything.

### Push Dispatcher (thin, impure)

The one place that talks to the push service. Interface: send these notifications, return tickets; reconcile these tickets, return tokens to retire. Hides batching limits and receipt semantics. Deliberately shallow — it is an adapter, not domain logic, and it is not unit tested.

### Shells

A shared typed database client. Data-access hooks that own loading, empty and error states and hand raw Rates to a Rate Book. Screens containing layout and interaction only. Edge Functions that fetch, delegate, and write.

**This refines the single-seam sketch from the specification.** Three pure modules rather than one is the better decomposition: the Rate Book is consumed by the user interface, the Upstream Feed only by a scheduled function, and the Alert Engine only by a different scheduled function. Collapsing them into one module would produce something with three unrelated reasons to change.

**Modules to be tested: Rate Book, Upstream Feed, Alert Engine.** The Push Dispatcher and all shells are not unit tested.

## Implementation Decisions

### Markets and currencies

The Market discriminator is `parallel | official`. It names markets rather than institutions, because the publisher of Nigeria's official rate has changed twice since 2023 — the I&E window became NAFEM, which became NFEM under the EFEMS matching system in December 2024. The publishing institution is recorded in the Rate's Source instead, where it can change without a data migration.

Naira is the implicit base of every Rate and is not a listed currency.

Both Markets store Buy, Central and Sell. The Official Market populates all three from upstream; the Parallel Market populates Buy and Sell only. This yields one shape across both Markets and removes null-handling branches from the interface.

Seeded Quoted Currencies: USD, GBP, EUR, CHF, JPY, CNY, ZAR, AED, SAR, DKK, CAD. The first ten are published by CBN. CAD is parallel-only — genuinely traded on the Nigerian street but absent from CBN's published set — and the interface states explicitly that it has no official counterpart.

Tracked Currencies, meaning those the Admin observes manually: USD, GBP, EUR, CAD. Four entries per round rather than eleven, because a rate round that takes thirty seconds gets done and one that takes five minutes does not. Unrecorded rates decay into Stale ones, and Freshness is the product.

Non-consumer units published by CBN — CFA, WAUA and SDR — are excluded. The latter two are accounting units, not spendable money.

### Rates are append-only

Rates are never updated or deleted. A mistake is corrected by recording a new observation; the erroneous Rate remains in history as a record of what Readers were shown. The live Rate for a pair is the most recent row.

Two independent guards make this safe rather than reckless. Rate entry requires confirmation when a typed value deviates more than 15% from the last recorded Rate for that pair. And Rate Alerts evaluate only Rates whose Observed At is at least ten minutes old, giving a correction time to land before a typo becomes a push notification. Display remains immediate; only alert evaluation lags, which no Reader can perceive.

### Two timestamps

Every Rate carries Observed At — when Canji recorded it — and, where the source provides one, a Rate Date, the trading day the figure belongs to according to the source. An Official Market Rate fetched on Monday may carry Friday's Rate Date. Official Market Freshness is computed from Rate Date; Observed At is what the Reader sees as "updated". All times render in Africa/Lagos, labelled WAT, irrespective of device timezone.

### Freshness

Parallel Market, elapsed-time based: Fresh under 6 hours, Aging 6 to 24 hours, Stale beyond.

Official Market, publication-day based: Fresh when the Rate Date is the most recent weekday, Aging one weekday behind, Stale at two or more. CBN does not publish at weekends, so an hours-based rule would mark a correct Saturday figure as Stale and destroy exactly the trust the product is built on. No holiday calendar is maintained — a public holiday shows Aging for a day, which is honest rather than wrong.

### Spread and Gap

Spread is the distance between Buy and Sell within one Market. Gap is the distance between Markets. They are distinct words because one word for two concepts breaks the moment both appear on screen.

The Gap compares the Parallel Market Sell Rate against the Official Market Central Rate, labelled with that convention. It is suppressed entirely — not greyed, not footnoted — when either side is Stale, or when the Quoted Currency has no Official Market Rate. A Gap computed from a four-day-old parallel observation is the most misleading number this product could print, and it is the number screenshots get taken of.

### Conversion

Directional, using the side of the Spread that would actually apply. Holding a Quoted Currency and converting to Naira multiplies by the Buy Rate, because the market operator is buying. Holding Naira and converting to a Quoted Currency divides by the Sell Rate, because the market operator is selling. The Official Market uses the Central Rate in both directions, because no retail counterparty exists in the official window. The applied side is displayed.

A symmetric midpoint conversion would understate cost by the full Spread, which is precisely the quantity a Reader is trying to see.

Buy and Sell are defined from the market operator's perspective, matching the convention every Nigerian rate source uses. A database constraint rejects Parallel Market Rates where Sell is below Buy.

### Presentation

Parallel Market values display as whole Naira; Official Market values to two decimal places. Full upstream precision is always stored and rounding happens only at render, which keeps the product clear of CBN's licence condition against amending or distorting published material. The About screen states that displayed values are rounded.

Dark theme, amber and gold accent on near-black. Deliberately green-free, both to differentiate from the incumbent and so that Freshness states can share a single hue ramp without colliding with the brand colour.

Four tabs — Rates, Convert, News, Alerts — plus a hidden administrative route excluded from the tab bar and guarded by an authentication check, reached by long-pressing the logo in the Rates header. The disclaimer renders inline and undismissable beneath the rate list. Legal text and CBN attribution live on an About screen reached from the Rates header.

### Data sources

Primary is the Central Bank of Nigeria's public JSON endpoint returning a rolling window of recent rates, unauthenticated, approximately 32 KB, verified live during specification. A full-history endpoint exists and is used at most once for backfill, never on a schedule — it returns over 8 MB and ignores every pagination parameter.

Fallback is Frankfurter's CBN provider, which reproduces CBN's Central Rate to four decimal places but carries no Spread.

Fetched three times per weekday at 06:00, 12:00 and 18:00 WAT. Hourly polling was rejected: the source publishes once per weekday, so hourly buys nothing and triples exposure to an undocumented API.

The dedupe key is the Quoted Currency together with the Rate Date. A fetch returning an already-stored figure inserts nothing.

Upstream currency labels are dirty — trailing whitespace and tab characters, inconsistent spellings across history. Labels are trimmed, upper-cased, then mapped through an explicit table. Unmapped labels are logged and skipped, never inferred.

The CBN rates web page is rendered client-side and its raw HTML contains no rate data. It must not be scraped.

### Health monitoring

Two independent checks, because the likelier failure of an undocumented endpoint is a 200 response carrying stale or reshaped data, not a thrown error. First, shape validation on every fetch. Second, a weekday check that an Official Market Rate bearing today's Rate Date has arrived by 10:00 WAT. Incidents are recorded and pushed to the Admin's own device, reusing the alert delivery plumbing so that no email provider is required.

### Identity and access

Every install signs in anonymously, giving each device a real authenticated identity rather than a client-supplied device string. This makes row-level security meaningful — a client-provided identifier can be guessed, letting anyone enumerate or delete another Reader's alerts — and provides the upgrade path to accounts for a later paid tier.

Read access on rates, currencies, news items and news sources is granted to both the unauthenticated and authenticated roles. Anonymous sign-in is rate-limited to 30 requests per hour per IP, which is plausible to hit on shared or NAT'd connections in Nigeria, and a rate limit that locked someone out of seeing a rate would be an own goal.

Write access requires an administrative flag on the signing-in user's profile. Profile rows are created automatically on user creation with the flag false. There is no update policy on profiles at all — the flag is settable only by the service role, directly against the database. A flag the application can grant itself is not a flag.

Rate Alerts are readable and writable only by their owner. Anonymous users are the expected owners, so no restriction against anonymous identity applies to them.

Admin and Reader are separate identities. Signing in as Admin on a device with an anonymous session ends that session rather than merging the two. The platform does not migrate anonymous rows on sign-in to an existing account, and building conflict resolution between a rate-recording identity and a consumer alerts identity would add complexity with no product value.

The Admin account requires a second factor. The current MFA API has not been verified and must be confirmed before administrative authentication is built.

### Alerts

An alert stores its Watched Side, defaulting to the Sell Rate for the Parallel Market and the Central Rate for the Official Market. Alerts are edge-triggered, firing on the Crossing rather than for as long as the threshold is exceeded, which requires storing the last seen Rate. A fired alert deactivates itself and its notification offers one-tap re-arm. Ten active alerts per Reader, which is the natural place to later gate a free tier lower.

Delivery batches at 100 messages per send. Tickets are stored and receipts checked roughly fifteen minutes later, before they are purged upstream at 24 hours. A token returning a not-registered result deactivates its alerts; without that step the push list rots.

### News

A News Item stores headline, publisher, URL, image URL and ordering. Article text is never stored or rendered — a copyright line, not a scope decision. Images are hot-linked with a placeholder fallback rather than re-hosted; re-hosting a publisher's asset undermines the link-only posture that makes the feature safe.

News Sources are a first-class table keyed by domain, so a publisher has one canonical name rather than three spellings. The extraction function resolves an article's domain against this table and rejects unrecognised domains. The Admin can add a domain from the application, because a migration-only allowlist means hitting a wall on your own product when a story breaks on a site you forgot.

Seeded News Sources: nairametrics.com, businessday.ng, punchng.com, premiumtimesng.com, thecable.ng, vanguardngr.com, thisdaylive.com, reuters.com, bloomberg.com.

### Schema

Profiles hold an administrative flag, one per authenticated user. Currencies hold display configuration plus two booleans: whether the currency is a Tracked Currency observed manually, and whether it has an official counterpart. A separate table maps normalised upstream labels to currency codes.

Rates hold the currency, the Market, Buy, Central and Sell, a Source drawn from a fixed set, an optional Rate Date, the recording user, and Observed At. There is no update or delete policy. A constraint enforces that a Parallel Market Rate has a Sell at or above its Buy. An index covers currency, market and recency.

News sources are keyed by domain; news items reference them. Rate alerts hold the owning user, push token, currency, market, Watched Side, direction, threshold, last seen Rate, active flag and last fired time. A system events table records operational incidents.

A view exposes the most recent Rate per currency and Market, created with invoker security so that the base table's policies apply to the caller. Views are definer-security by default in Postgres and would otherwise expose every row regardless of policy.

### Realtime

Postgres publications cannot contain views, so the latest-rates view can never emit change events. The client subscribes to insert events on the base rates table and refetches the view on each event. The alternative — patching an in-memory map from the event payload — would reimplement the newest-per-pair rule in a second language, and a divergence between the two implementations appears as a wrong number on screen. Refetching costs one small query on a human-paced event.

Realtime enforces row-level security per subscriber, so the base table needs both a select grant and a permissive select policy for the subscribing role.

### Scheduling and secrets

Scheduled work runs via database cron calling Edge Functions over HTTP. The project URL and publishable key are stored in the platform vault and read at call time; the service role key is never placed in cron command text, which is readable by anything that can reach the cron schema. Each function verifies its caller and elevates internally using the service role key already present in its own environment.

### Platform

Expo managed workflow with file-based routing. A development build is configured at the outset rather than deferred, because remote push does not work in Expo Go and Android additionally requires FCM V1 credentials and a Google services file. Retrofitting native credentials late is substantially worse than one configure command against an empty project; earlier phases still run in Expo Go against the same code.

NativeWind is pinned to its current stable line with Tailwind CSS 3; the next major is a release candidate only. Its support for React Native's New Architecture is undocumented in either direction, so the first phase includes a smoke screen rendering styled components with the New Architecture enabled, gating all subsequent interface work.

The database runs remote-only — Docker is not installed on the development machine — with real migration files committed. Types are generated from the linked remote project.

## Testing Decisions

A good test here states a fact about the domain that a Reader would recognise, and would still pass if the implementation were rewritten. "Converting Naira to dollars divides by the Sell Rate" is such a fact. "The conversion helper calls the rate formatter" is not.

Tests pass the current instant in explicitly rather than reading a clock, so a Freshness test asserts a relationship between two instants rather than depending on when it runs. No database client is mocked anywhere; a test that needs such a mock is being written at the wrong seam.

**Tested: Rate Book, Upstream Feed, Alert Engine.** Not tested: the Push Dispatcher, the data-access hooks, the screens, the Edge Functions.

Rate Book coverage: both conversion directions in the Parallel Market, confirming the correct side of the Spread each time; Official Market conversion via the Central Rate; behaviour when a Rate is absent; both Freshness rules including the Parallel boundaries at 6 and 24 hours; the publication-day rule specifically asserting that a Friday Rate Date reads Fresh on Saturday and Sunday, Aging on Monday, Stale on Tuesday; weekday arithmetic across a month boundary; Gap computation, and its suppression when either side is Stale or no official counterpart exists.

Upstream Feed coverage: labels carrying trailing whitespace and tab characters map correctly; unmapped labels are reported rather than dropped or guessed; both upstream date formats parse; dedupe identifies an already-stored pair and admits a changed figure for the same pair.

Alert Engine coverage: firing on a Crossing in both directions; not firing while the Rate merely remains beyond the threshold; behaviour on the first observation when no last seen Rate exists; the settle delay excluding Rates younger than the threshold.

One contract test hits the live upstream endpoint and asserts payload shape and the presence of recent Rate Dates. It runs in continuous integration and fails loudly. This is the cheapest available early warning for the silent-failure mode described under Health monitoring, and it is the only test permitted to touch the network.

No prior art exists — this is a greenfield repository, and this document establishes the convention.

## Out of Scope

Legally out of scope, not merely deferred: peer-to-peer trading, order matching, wallets, or any facilitation of a foreign-exchange transaction; holding or transmitting funds; a cryptocurrency section; republished article text. Canji is an information service and must remain visibly one. These lines are what keep the distinction from an unlicensed dealer intact.

Deferred to later versions: a licensed bureau de change directory; remittance-rate comparison with referral revenue; paid alert tiers, though the alert plumbing is built to be gated later and ships free in v1. Historical rate charts were also parked here and are now shipping free — see ADR 0006; multiple Admins; per-city or regional Parallel Market rates, since v1 reports one national figure; iOS, though nothing in the architecture precludes it.

Explicitly not built: a holiday calendar for Freshness; captcha on anonymous sign-in, since the IP rate limit and a periodic purge are considered sufficient and revisitable if row growth looks abusive rather than organic; retention or archival of Rate history, since volume is negligible and history is a future feature; the turnover, high and low figures available from the upstream source, which are not consumer-legible.

## Further Notes

Two facts remain unverified and are gates rather than assumptions. The platform's current MFA API has not been checked against documentation and must be before administrative authentication is built. NativeWind's New Architecture support is undocumented in either direction and must be confirmed empirically before any interface work; if it fails, that is the moment to reconsider the styling approach, not several phases later.

One upstream currency label is ambiguous between the Saudi and Qatari riyal. It is mapped to the Saudi riyal on the basis of CBN's historical listing, and should be confirmed against a CBN publication before that currency is surfaced prominently.

The upstream endpoint is undocumented and unversioned. It works today and is permitted by the site's robots file and legal terms, which require attribution and forbid distorting the content — hence full-precision storage and the attribution on the About screen. It may change without notice. The health monitoring, the fallback provider and the contract test exist collectively because this dependency is genuinely fragile, not because the pattern is conventional.

Delivery order is the phased sequence from the original brief: scaffold, then schema and types, then rates and converter, then the administrative area, then news, then automatic official-rate fetching, then alerts. Each phase leaves the application runnable. Schema changes are proposed for approval before being applied.
