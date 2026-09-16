# Official Rates come from an undocumented CBN JSON endpoint

Canji fetches Official Market Rates from `cbn.gov.ng/api/GetAllExchangeRatesGRAPH`, an unauthenticated JSON endpoint that backs the CBN's own rates page. It is undocumented and unversioned. It was verified live during specification and is the most faithful source available.

## Considered options

The documented-looking `/rates/ExchRateByCurrency.asp` path is dead — it returns 404 and is disallowed by the site's robots file, though third-party services still cite it as their source. The HTML rates page cannot be scraped: its table is rendered client-side and the raw markup contains no rate data. FMDQ, which computes the underlying NFEM figures, has no public endpoint and gates its market data behind a portal subscription. General currency APIs such as `open.er-api.com` return market mid rates, not the official figure — measurably different, and the wrong number for a product whose purpose is distinguishing the two.

Frankfurter's CBN provider reproduces the CBN's central rate to four decimal places and serves as the automatic fallback, but it carries no spread, so it cannot be the primary.

## Consequences

This dependency is genuinely fragile, and three mechanisms exist solely because of it. None is defensive habit; each addresses a specific observed risk:

- **Payload shape validation on every fetch**, because the endpoint is unversioned and may be reshaped without notice.
- **A weekday check that a Rate bearing today's Rate Date arrived by 10:00 WAT**, because the likelier failure is a 200 response carrying stale data, which no error handler would catch.
- **A contract test against the live endpoint in CI**, as the cheapest early warning that the shape has moved.

Operational quirks that are easy to rediscover the hard way: the endpoint ignores every pagination parameter and always returns its full payload, so the rolling-window variant is used rather than the 8 MB history endpoint. Currency labels carry trailing whitespace and tab characters and use inconsistent spellings across history, so they are normalised and mapped through an explicit table, with unmapped labels logged and skipped rather than guessed.

The CBN's legal terms permit copying provided the bank is expressly credited and the content is not amended or distorted. That is why full upstream precision is stored and rounding happens only at render.
