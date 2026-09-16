import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * check-push-receipts — learns what actually happened to sent notifications.
 *
 * A ticket only says Expo accepted the message. The receipt, available a few
 * minutes later, says whether the device received it. Without this step a
 * token belonging to an uninstalled app stays on the list forever, and every
 * future send wastes a slot on a device that will never hear it.
 *
 * DeviceNotRegistered is the one outcome that changes state: those alerts are
 * deactivated, because nothing can be delivered to that token again.
 */

const EXPO_RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH = 1000; // Expo's documented maximum ticket ids per request.

// Receipts are not available immediately and are purged upstream after 24
// hours, so only tickets inside that window are worth asking about.
const READY_AFTER_MS = 15 * 60 * 1000;
const EXPIRES_AFTER_MS = 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = Date.now();
  const readyBefore = new Date(now - READY_AFTER_MS).toISOString();
  const expiredBefore = new Date(now - EXPIRES_AFTER_MS).toISOString();

  // Anything older than the upstream retention window will never get an
  // answer. Closing them keeps the pending index small.
  await supabase
    .from('push_tickets')
    .update({ resolved_at: new Date().toISOString(), outcome: 'expired' })
    .is('resolved_at', null)
    .lt('created_at', expiredBefore);

  const { data: pending, error } = await supabase
    .from('push_tickets')
    .select('ticket_id, alert_id')
    .is('resolved_at', null)
    .lt('created_at', readyBefore)
    .limit(BATCH);

  if (error) return json({ error: error.message }, 500);
  if (!pending || pending.length === 0) return json({ checked: 0 });

  let receipts: Record<string, { status: string; details?: { error?: string } }>;

  try {
    const response = await fetch(EXPO_RECEIPTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids: pending.map((t) => t.ticket_id) }),
      signal: AbortSignal.timeout(20_000),
    });

    const body = (await response.json()) as { data?: typeof receipts };
    receipts = body.data ?? {};
  } catch (fetchError) {
    await supabase.from('system_events').insert({
      kind: 'push_receipts_failed',
      detail: { reason: String(fetchError) },
    });
    return json({ error: 'Could not reach the push service.' }, 502);
  }

  const retired: string[] = [];
  let resolved = 0;

  for (const ticket of pending) {
    const receipt = receipts[ticket.ticket_id];
    if (!receipt) continue;

    resolved += 1;
    const outcome =
      receipt.status === 'ok' ? 'ok' : (receipt.details?.error ?? 'error');

    await supabase
      .from('push_tickets')
      .update({ resolved_at: new Date().toISOString(), outcome })
      .eq('ticket_id', ticket.ticket_id);

    if (outcome === 'DeviceNotRegistered' && ticket.alert_id) {
      retired.push(ticket.alert_id);
    }
  }

  if (retired.length > 0) {
    await supabase
      .from('rate_alerts')
      .update({ active: false })
      .in('id', retired);

    await supabase.from('system_events').insert({
      kind: 'push_tokens_retired',
      detail: { alerts: retired.length },
    });
  }

  return json({ checked: pending.length, resolved, retired: retired.length });
});
