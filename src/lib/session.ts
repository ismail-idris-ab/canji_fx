import { supabase } from './supabase';

/**
 * Ensures the device has an identity.
 *
 * Every install signs in anonymously, so each device holds a real auth.uid()
 * rather than a client-supplied string. Rate Alerts are owned by that id and
 * row-level security scopes them with it — a guessable identifier would let
 * anyone read or delete another Reader's alerts. See ADR 0002.
 *
 * This deliberately does not throw. Anonymous sign-in is rate limited to 30
 * requests per hour per IP, which is plausible to hit on a shared or NAT'd
 * connection in Nigeria. Reading rates does not require a session, so a
 * failure here must never stop someone seeing a rate — it only defers the
 * features that do need an identity.
 */
export async function ensureAnonymousSession(): Promise<
  { signedIn: true } | { signedIn: false; reason: string }
> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return { signedIn: true };

  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    return { signedIn: false, reason: error.message };
  }

  return { signedIn: true };
}
