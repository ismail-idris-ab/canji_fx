# Canji

Nigerian foreign-exchange rates, with their provenance and their age.

Canji reports two numbers for each currency against the Naira: the **parallel market** rate, observed on the street, and the **official market** rate, published by the Central Bank of Nigeria. Every rate on screen carries where it came from, when it was observed, and a one-word judgement of how much to trust it.

The honesty is the product. Most sources show a number with no indication of when it was seen, so a reader cannot tell this morning's rate from last Tuesday's. Canji answers the question people are actually asking, which is not "what is the rate" but "can I trust this number, and how old is it".

## What Canji is not

Canji is an information service. It does not set, offer, quote or guarantee any rate, does not buy or sell currency, does not match buyers with sellers, and never holds money.

That distinction is legally load-bearing in Nigeria, not a stylistic preference, and it shapes the product surface rather than just the terms of service. There is no trading, no wallet, no order matching and no crypto section, and none of those are "not yet" — see the out-of-scope section of the PRD.

## Stack

Expo SDK 57 with expo-router, React Native 0.86, TypeScript strict, NativeWind 4 on Tailwind 3. Supabase for Postgres, auth, row-level security, realtime and Edge Functions, with `pg_cron` for schedules.

## Architecture

Three pure domain modules carry everything that can be wrong about a number. They import no React, no Supabase client and no networking, and they never read the clock — the current instant is always passed in. That is what lets them be tested without mocks, and it is the only testing seam in the codebase.

| Module | Owns |
| --- | --- |
| `src/domain/rate-book.ts` | Which observation is live, its freshness, conversion, the gap between markets |
| `src/domain/upstream-feed.ts` | Parsing the CBN payload, label mapping, dedupe |
| `src/domain/alert-engine.ts` | Which rate alerts have been crossed and should fire |

Everything else is a thin shell: hooks fetch and hand raw rows to a domain module, screens lay out what it returns, Edge Functions perform I/O and delegate every decision.

Edge Functions cannot import from `src/`, so `npm run sync:functions` copies those modules into `supabase/functions/_shared/`. The copies are generated and marked as such; the source of truth is always `src/domain`, because that is where the tests run.

## Concepts worth knowing before reading the code

The full glossary is [`CONTEXT.md`](./CONTEXT.md). Four terms do the most work:

**Rate** — an observation of what one unit of a currency was worth in Naira, in one market, at one moment, according to one source. Historical record, never a live price Canji offers.

**Freshness** — how much confidence to place in a rate, expressed as Fresh, Aging or Stale. Two different rules: the parallel market trades continuously so it decays in elapsed hours, while the official market publishes on weekdays only, so a Friday rate stays current all weekend rather than decaying while its source is simply closed.

**Spread and Gap** — spread is the distance between buy and sell *within* one market; gap is the distance *between* markets. Separate words, because one word for two concepts breaks the moment both appear on screen.

**Observed At and Rate Date** — when Canji recorded a rate, versus the trading day the source says it belongs to. An official rate fetched on Monday may carry Friday's rate date.

## Decisions

`docs/adr/` records the choices a reader would otherwise assume were mistakes:

- [0001](./docs/adr/0001-rates-are-append-only.md) — rates are append-only and never retracted
- [0002](./docs/adr/0002-anonymous-auth-instead-of-device-ids.md) — readers are anonymous authenticated users, not device identifiers
- [0003](./docs/adr/0003-markets-are-named-as-markets.md) — markets are named as markets, not after their publisher
- [0004](./docs/adr/0004-depending-on-an-undocumented-cbn-endpoint.md) — official rates come from an undocumented CBN JSON endpoint
- [0005](./docs/adr/0005-no-mfa-on-the-admin-account-for-v1.md) — no second factor on the admin account in v1

The specification and PRD are in [`docs/specs/`](./docs/specs/).

## Running it

```bash
npm install
cp .env.example .env     # fill in the project URL and anon key
npm start                # add --dev-client if using a development build
```

Push notifications need a development build; they do not work in Expo Go.

```bash
npm run typecheck
npm test                 # the three domain modules
npm run db:push          # apply migrations to the linked project
npm run db:types         # regenerate src/types/database.ts after a migration
npm run sync:functions   # copy domain modules into supabase/functions/_shared
```

The Supabase service role key belongs only in the Edge Function environment, set through the dashboard. It must never appear in `.env` or the repository.

## Scheduled jobs

| Job | Schedule (UTC) | Does |
| --- | --- | --- |
| `fetch-cbn-rates` | 05:00, 11:00, 17:00 Mon–Fri | Records official rates |
| `check-alerts` | every 15 min | Fires rate alerts on a crossing |
| `check-push-receipts` | :07 :22 :37 :52 | Retires dead push tokens |
| `check-rate-health` | 09:05 Mon–Fri | Notices a silently stalled fetch |
| `purge-anonymous-users` | Sun 02:00 | Removes abandoned readers |

All are safe to invoke repeatedly. Cron calls carry only the publishable anon key; each function reads the service role key from its own environment, so no secret appears in `cron.job`.

## Attribution

Official market rates are published by the [Central Bank of Nigeria](https://www.cbn.gov.ng/rates/exchratebycurrency.html) and are reproduced unaltered. The Bank's terms permit reuse provided it is expressly credited and the content is not amended, which is why full precision is stored and rounding happens only at render.
