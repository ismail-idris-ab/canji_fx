-- A Source label for bulk-imported history.
--
-- Backfilled Rates keep an honest Observed At: Canji recorded them at import
-- time, and claiming it observed a rate in 2001 would corrupt the one field
-- this product treats as sacred. Charts key off rate_date, so the series is
-- correct either way — but without a distinct label, an analyst reading an
-- export cannot tell a live daily fetch from a one-off bulk import.
--
-- Adding an enum value is separated from any use of it: Postgres will not
-- allow a new value to be used in the transaction that created it.
alter type public.rate_source
  add value if not exists 'Central Bank of Nigeria (historical import)';
