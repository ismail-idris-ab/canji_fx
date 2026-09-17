# No second factor on the admin account in v1

Aboki Rate has one admin account, and that account is the only thing that can record Parallel Market Rates. It is protected by a password alone. TOTP multi-factor authentication was specified, researched against the current Supabase documentation, and then deliberately deferred.

## Why this is not an oversight

A reader finding privileged database writes behind a single password will reasonably assume MFA was forgotten. It was not. Supabase's MFA implementation has three properties that combine badly with a single-admin product:

- **There are no recovery codes.** The documentation states plainly: *"Recovery codes are not supported."*
- **Unenrolling requires aal2.** *"A user has to have an `aal2` authenticator level in order to unenroll a `verified` factor."* Removal is gated behind exactly the thing a locked-out admin has lost, so there is no self-service escape.
- **Enrolling ends every other session.** *"Upon verifying a factor, all other sessions are logged out."* A botched enrollment on a new device destroys the working session on the old one at the same moment.

The documented substitute for recovery codes is enrolling a second TOTP factor on a separate device and storing its secret offline. That is real work, and doing it incompletely adds the lockout risk without buying the protection.

## The trade

Losing the admin account permanently would stop Parallel Market Rates entirely — the half of the product that cannot be automated, since the Official Market fetch runs unattended. Against that, the threat MFA prevents is credential compromise, and at v1 there are no users, no public listing, and therefore little attacker incentive.

Two controls already limit what a compromised account could achieve, and both are live:

- Rates are append-only with `created_by` on every row, so tampering is permanent, visible and attributable.
- Rate entry refuses an inverted spread and requires confirmation beyond a 15% deviation, capping the damage of any single write.

These are detective and limiting rather than preventive. That is an accepted weakness, not an unnoticed one.

## Consequences

The admin password must be long, unique and stored in a password manager. It is the only thing standing between a stolen device and a false national rate.

Two RLS templates appear in the Supabase documentation, and only one is safe here. The headline "enforce for all users" policy applies to the whole `authenticated` role — **which includes every anonymous Reader**, since that is how Aboki Rate identifies devices. Shipping it would lock the entire userbase out of reading rates. Whoever implements MFA later must use the opted-in variant, which demands aal2 only from users holding a verified factor, and must scope it to admin-write tables so the reader path is untouched.

## When to revisit

Any one of these makes MFA worth its lockout risk:

- The app is publicly listed.
- A second admin exists, which makes lockout survivable rather than terminal.
- Anyone beyond the builder consumes the rate feed.

At that point, enable TOTP together with a second enrolled factor on a different device, the backup secret stored offline, and a service-role `auth.admin.mfa.deleteFactor()` break-glass script that has been run successfully at least once.
