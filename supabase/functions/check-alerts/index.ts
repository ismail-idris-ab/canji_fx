import { createClient } from 'jsr:@supabase/supabase-js@2';

import { evaluateAlerts, type Alert } from '../_shared/alert-engine.ts';
import type { Rate } from '../_shared/types.ts';

/**
 * check-alerts — fires Rate Alerts whose threshold has been crossed.
 *
 * Every firing rule lives in the shared Alert Engine, which is pure and unit
 * tested. This function only performs I/O: read, delegate, send, record.
 *
 * Safe to invoke repeatedly. Alerts are edge-triggered and a fired alert
 * deactivates itself, so a second call sends nothing.
 */

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo's documented maximum per request.

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function naira(value: number, market: string): string {
  return `₦${value.toLocaleString('en-NG', {
    minimumFractionDigits: market === 'parallel' ? 0 : 2,
    maximumFractionDigits: market === 'parallel' ? 0 : 2,
  })}`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: alertRows, error: alertError } = await supabase
    .from('rate_alerts')
    .select(
      'id, user_id, expo_push_token, currency_code, market, watched_side, direction, threshold, last_seen_rate'
    )
    .eq('active', true);

  if (alertError) return json({ error: alertError.message }, 500);
  if (!alertRows || alertRows.length === 0) {
    return json({ evaluated: 0, sent: 0 });
  }

  // Recent Rates only. The engine needs enough history to pick the newest
  // settled observation per pair, not the whole table.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rateRows, error: rateError } = await supabase
    .from('rates')
    .select('currency_code, market, buy, central, sell, source_label, rate_date, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (rateError) return json({ error: rateError.message }, 500);

  const rates: Rate[] = (rateRows ?? []).map((row) => ({
    currencyCode: row.currency_code,
    market: row.market,
    buy: row.buy,
    central: row.central,
    sell: row.sell,
    sourceLabel: row.source_label,
    rateDate: row.rate_date,
    observedAt: new Date(row.created_at),
  }));

  const alerts: Alert[] = alertRows.map((row) => ({
    id: row.id,
    currencyCode: row.currency_code,
    market: row.market,
    watchedSide: row.watched_side,
    direction: row.direction,
    threshold: Number(row.threshold),
    lastSeenRate: row.last_seen_rate === null ? null : Number(row.last_seen_rate),
    expoPushToken: row.expo_push_token,
  }));

  const { fires, updates } = evaluateAlerts(alerts, rates, new Date());

  const messages: PushMessage[] = fires.map(({ alert, rate }) => ({
    to: alert.expoPushToken,
    title: `${alert.currencyCode} ${alert.direction} ${naira(alert.threshold, alert.market)}`,
    body: `${alert.market === 'parallel' ? 'Parallel' : 'Official'} ${
      alert.watchedSide
    } is now ${naira(rate, alert.market)}.`,
    data: { alertId: alert.id, currencyCode: alert.currencyCode, rate },
  }));

  let sent = 0;
  const tickets: { ticket_id: string; alert_id: string }[] = [];

  for (let index = 0; index < messages.length; index += BATCH) {
    const chunk = messages.slice(index, index + BATCH);
    const chunkFires = fires.slice(index, index + BATCH);

    try {
      const response = await fetch(EXPO_SEND, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(20_000),
      });

      const body = (await response.json()) as {
        data?: { status: string; id?: string; message?: string }[];
      };

      (body.data ?? []).forEach((ticket, position) => {
        if (ticket.status === 'ok' && ticket.id) {
          sent += 1;
          tickets.push({
            ticket_id: ticket.id,
            alert_id: chunkFires[position].alert.id,
          });
        }
      });
    } catch (error) {
      await supabase
        .from('system_events')
        .insert({ kind: 'push_send_failed', detail: { reason: String(error) } });
    }
  }

  if (tickets.length > 0) {
    await supabase.from('push_tickets').insert(tickets);
  }

  // Applied after sending, so a send that throws does not leave an alert
  // marked as fired when no notification went out.
  for (const update of updates) {
    await supabase
      .from('rate_alerts')
      .update({
        last_seen_rate: update.lastSeenRate,
        active: !update.deactivate,
        last_fired_at: update.deactivate ? new Date().toISOString() : undefined,
      })
      .eq('id', update.alertId);
  }

  return json({ evaluated: alerts.length, fired: fires.length, sent });
});
