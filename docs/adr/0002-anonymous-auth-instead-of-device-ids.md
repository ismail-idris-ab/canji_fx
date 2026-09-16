# Readers are anonymous authenticated users, not device identifiers

Every install signs in anonymously, so each device has a real `auth.uid()` rather than a client-supplied device string. Rate Alerts are owned by that id, and row-level security scopes them with `auth.uid()`.

## Considered options

The original design keyed alerts on a `device_id` text column. That cannot be secured: any policy over it has to trust a value the client sends, so anyone could enumerate, read or delete another Reader's alerts — including their push tokens — by guessing or iterating identifiers. Requiring sign-up was also rejected, as email-gating alerts in v1 would cost more adoption than it is worth.

Anonymous auth gives the same zero-friction experience as a device id while making the policies actually enforceable, and it is the seam a paid tier later hangs on: an anonymous user can be converted to a permanent one without changing how anything is owned.

## Consequences

Readers arrive as the `authenticated` role, not `anon`, so policies written `to anon` alone would match nobody. Read policies on rates, currencies and news deliberately cover **both** roles: anonymous sign-in is rate limited to 30 requests per hour per IP, which is plausible to hit on shared or NAT'd connections in Nigeria, and a rate limit that stopped someone seeing a rate would defeat the product.

Every install creates a real row in `auth.users` and nothing is cleaned up automatically, so a scheduled purge of abandoned anonymous accounts is required rather than optional. Captcha was considered and rejected for v1: friction at first launch, at exactly the moment someone is deciding whether to keep the app.

Admin and Reader remain separate identities. Signing in as Admin ends any anonymous session rather than merging the two, because the platform does not migrate anonymous rows to an existing account and building that reconciliation would add complexity with no product value.
