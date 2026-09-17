// Hand-written Deno helper. Unlike _shared/, nothing here is generated.

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';

/**
 * Tells the Admin something is wrong with the pipeline.
 *
 * Reuses the push path rather than adding an email provider for a handful of
 * messages a year. An incident is always recorded in system_events first, so
 * a failed or unregistered push degrades to "visible in the admin screen"
 * rather than to silence.
 */
export async function notifyAdmin(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  kind: string,
  detail: unknown,
  message: { title: string; body: string }
): Promise<number> {
  await supabase.from('system_events').insert({ kind, detail });

  const { data } = await supabase
    .from('admin_push_tokens')
    .select('expo_push_token');

  const tokens: string[] = (data ?? []).map(
    (row: { expo_push_token: string }) => row.expo_push_token
  );

  if (tokens.length === 0) return 0;

  try {
    await fetch(EXPO_SEND, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(
        tokens.map((to) => ({ to, ...message, data: { kind } }))
      ),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    await supabase.from('system_events').insert({
      kind: 'admin_push_failed',
      detail: { forKind: kind, reason: String(error) },
    });
    return 0;
  }

  return tokens.length;
}
