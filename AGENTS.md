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
`EXPO_PUBLIC_SUPABASE_ANON_KEY` and throws by name if either is absent.

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
