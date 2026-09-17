import { createClient } from 'jsr:@supabase/supabase-js@2';

import { calledByScheduler, refuse } from '../_lib/cron-auth.ts';
import { mostRecentWeekday, toLagosDate } from '../_shared/time.ts';

/**
 * check-rate-health — notices when the Official Market pipeline has quietly
 * stopped working.
 *
 * Two failures produce no error anywhere. The upstream endpoint can return a
 * 200 carrying yesterday's data, and a paused or throttled project simply
 * stops running the fetch. Either way the app keeps showing an ageing figure
 * and nothing complains. See ADR 0004.
 *
 * Runs mid-morning on weekdays, by which time the 06:00 WAT fetch should have
 * produced a Rate bearing today's Rate Date.
 */

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (!(await calledByScheduler(request, supabase))) return refuse();

  const now = new Date();
  const today = toLagosDate(now);
  const expected = mostRecentWeekday(today);

  // Before the CBN has published, a missing figure is not a fault. The cron
  // only fires mid-morning, but this function must give an honest answer
  // whenever it is invoked — otherwise a manual check at 1am reports an
  // outage that does not exist, and the alarm stops meaning anything.
  const watHour = new Date(now.getTime() + 60 * 60_000).getUTCHours();

  if (expected === today && watHour < 10) {
    return json({
      healthy: null,
      reason: 'Too early. The CBN has not published today yet.',
      rateDate: expected,
    });
  }

  const { data: rows, error } = await supabase
    .from('rates')
    .select('currency_code')
    .eq('market', 'official')
    .eq('rate_date', expected)
    .limit(1);

  if (error) return json({ error: error.message }, 500);

  const healthy = (rows ?? []).length > 0;

  if (healthy) {
    return json({ healthy: true, rateDate: expected });
  }

  // How long this has been going on matters more than the fact of it: one
  // missed morning is a hiccup, three is an outage.
  const { data: latest } = await supabase
    .from('rates')
    .select('rate_date')
    .eq('market', 'official')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const detail = {
    expectedRateDate: expected,
    latestStoredRateDate: latest?.rate_date ?? null,
  };

  await supabase
    .from('system_events')
    .insert({ kind: 'official_rate_missing', detail });

  // Reuse the push path rather than adding an email provider for one message
  // a year.
  const { data: admins } = await supabase
    .from('admin_push_tokens')
    .select('expo_push_token');

  const tokens = (admins ?? []).map((row) => row.expo_push_token);

  if (tokens.length > 0) {
    try {
      await fetch(EXPO_SEND, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(
          tokens.map((to) => ({
            to,
            title: 'Official rate missing',
            body: `No CBN rate for ${expected}. Latest stored is ${
              detail.latestStoredRateDate ?? 'none'
            }. Check the fetch or enter it by hand.`,
            data: { kind: 'official_rate_missing' },
          }))
        ),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (sendError) {
      await supabase.from('system_events').insert({
        kind: 'health_push_failed',
        detail: { reason: String(sendError) },
      });
    }
  }

  return json({ healthy: false, ...detail, notified: tokens.length });
});
