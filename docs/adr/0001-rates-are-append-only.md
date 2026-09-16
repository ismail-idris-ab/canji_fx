# Rates are append-only and are never retracted

A Rate is an observation, not a value, so Canji records what it saw rather than what it currently believes. A mistake is corrected by observing again; the erroneous row stays in history as a record of what Readers were actually shown. There is no update or delete policy on the rates table anywhere in the schema.

## Considered options

A `retracted_at` column was proposed and rejected. It would let `latest_rates` skip a bad row and fall back to the previous good one, which is genuinely useful when a fat-fingered entry is live. It was rejected because the audit trail is the point: a product whose entire claim is "this is what the market said, and here is when" cannot also quietly erase what it said.

## Consequences

An erroneous Rate is visible to Readers until the next observation supersedes it, and remains in history permanently. Two guards exist specifically because of this, and removing either one makes this decision unsafe rather than merely strict:

- Rate entry requires a second confirmation when a value deviates more than 15% from the last Rate for that pair.
- Rate Alerts evaluate only Rates that have been settled for at least ten minutes, so a correction has time to land before a typo becomes a push notification to every install.

Display is never delayed — only alert evaluation — because ten minutes is imperceptible to a Reader but decisive for a notification that cannot be recalled.
