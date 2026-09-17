# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Canji

Domain vocabulary lives in `CONTEXT.md`. Use those terms exactly — Rate,
Market, Freshness, Spread, Gap, Observed At, Rate Date, Tracked Currency.
The spec and PRD are in `docs/specs/`.

## Commands

- `npm start` — Expo dev server
- `npm run typecheck` — tsc, no emit
- `npm test` — vitest over the pure domain modules only
- `npm run db:push` — apply migrations to the linked project
- `npm run db:types` — regenerate `src/types/database.ts`

## Environment

`app.config.ts` reads `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` and warns if either is absent. It must not
throw: EAS evaluates the config in contexts where the values legitimately do
not exist yet. `src/lib/env.ts` is what throws, at runtime, where a missing
value is unambiguously real.

Expo loads `.env` automatically in development. It does **not** in production
mode, so `expo export` needs the variables exported into the shell, and EAS
builds need them set as EAS environment variables — `.env` is gitignored and
never reaches the build servers.

The Supabase service role key belongs only in the Edge Function environment,
set through the dashboard. It must never appear in `.env` or the repository.

## Testing

Only `src/domain/**` is unit tested. Those modules are pure: no Supabase
client, no React, no network, and no clock reads — the current instant is
always passed in. A test that needs a Supabase mock is at the wrong seam.

## Decisions

`docs/adr/` records why the non-obvious choices were made. Read the relevant
one before changing behaviour it covers — each exists because a reasonable
reader would otherwise assume the opposite:

- `0001` Rates are append-only and never retracted
- `0002` Readers are anonymous authenticated users, not device identifiers
- `0003` Markets are named as markets, not after their publisher
- `0004` Official Rates come from an undocumented CBN JSON endpoint
- `0005` No second factor on the admin account in v1

## Edge Functions

`supabase/functions/**` runs on Deno and is excluded from the app's tsconfig.

`_shared/upstream-feed.ts` is **generated**. The source of truth is
`src/domain/upstream-feed.ts`, because that is where its tests run. After
changing it, run `npm run sync:functions` before deploying.

Deploy with `npx supabase functions deploy <name> --use-api` — the `--use-api`
flag avoids needing Docker.

## Scheduled jobs

| Job | Schedule (UTC) | Function |
|---|---|---|
| `fetch-cbn-rates` | 05:00, 11:00, 17:00 Mon–Fri | Official Market Rates |
| `check-alerts` | every 15 min | Fires Rate Alerts on a Crossing |
| `check-push-receipts` | :07 :22 :37 :52 | Retires dead push tokens |
| `purge-anonymous-users` | Sun 02:00 | Removes abandoned Readers |

All are safe to invoke repeatedly. Cron calls carry only the publishable anon
key; each function reads the service role key from its own environment, so no
secret appears in `cron.job`.
