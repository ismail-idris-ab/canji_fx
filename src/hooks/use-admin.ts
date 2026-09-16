import { useCallback, useEffect, useState } from 'react';

import { ensureAnonymousSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/**
 * Admin identity.
 *
 * Admin and Reader are separate identities, not one account with extra
 * powers. Signing in as Admin ends the device's anonymous session rather
 * than merging it: the platform does not migrate anonymous rows into an
 * existing account, and reconciling a rate-recording identity with a
 * consumer alerts identity would add complexity with no product value.
 * See ADR 0002.
 *
 * `isAdmin` is read from the database, never inferred from being signed in.
 * The flag lives in a table the application cannot write to.
 */

export type AdminState =
  | { status: 'checking' }
  | { status: 'signedOut'; signIn: SignIn; error: string | null }
  | { status: 'notAdmin'; email: string; signOut: () => Promise<void> }
  | { status: 'admin'; userId: string; email: string; signOut: () => Promise<void> };

type SignIn = (email: string, password: string) => Promise<void>;

export function useAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({ status: 'checking' });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // The device goes back to being a Reader, so it needs an identity again
    // for its Rate Alerts.
    void ensureAnonymousSession();
    setState({ status: 'signedOut', signIn, error: null });
  }, []);

  const evaluate = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    // An anonymous Reader is signed in, but is not an Admin candidate.
    if (!user || user.is_anonymous || !user.email) {
      setState({ status: 'signedOut', signIn, error: null });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    setState(
      profile?.is_admin
        ? { status: 'admin', userId: user.id, email: user.email, signOut }
        : { status: 'notAdmin', email: user.email, signOut }
    );
  }, [signOut]);

  const signIn = useCallback<SignIn>(
    async (email, password) => {
      setState({ status: 'checking' });

      // End the anonymous session first so the two identities never overlap.
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState({ status: 'signedOut', signIn, error: error.message });
        void ensureAnonymousSession();
        return;
      }

      await evaluate();
    },
    [evaluate]
  );

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  return state;
}
