-- One-time backfill of real Official Market Rates.
--
-- These are genuine observations taken from the CBN's published feed for
-- rate date 2026-09-15 — the same values, to the same precision, that the
-- scheduled fetch will later record on its own. They are seeded here so the
-- app has real data to render before that job exists.
--
-- Nothing here is invented. No Parallel Market Rates are seeded, because a
-- Parallel Market Rate is an Admin's observation of the street and there is
-- no honest way to manufacture one.

insert into public.rates
  (currency_code, market, buy, central, sell, source_label, rate_date)
values
  ('USD', 'official', 1328.1485, 1328.6485, 1329.1485, 'Central Bank of Nigeria', '2026-09-15'),
  ('GBP', 'official', 1792.3364, 1793.0112, 1793.6859, 'Central Bank of Nigeria', '2026-09-15'),
  ('EUR', 'official', 1533.6131, 1534.1904, 1534.7678, 'Central Bank of Nigeria', '2026-09-15'),
  ('CNY', 'official',  197.8797,  197.9542,  198.0287, 'Central Bank of Nigeria', '2026-09-15'),
  ('AED', 'official',  361.6076,  361.7437,  361.8798, 'Central Bank of Nigeria', '2026-09-15'),
  ('ZAR', 'official',   81.7277,   81.7585,   81.7892, 'Central Bank of Nigeria', '2026-09-15'),
  ('SAR', 'official',  353.5883,  353.7214,  353.8546, 'Central Bank of Nigeria', '2026-09-15'),
  ('CHF', 'official', 1621.4730, 1622.0834, 1622.6938, 'Central Bank of Nigeria', '2026-09-15'),
  ('JPY', 'official',    8.5731,    8.5764,    8.5796, 'Central Bank of Nigeria', '2026-09-15'),
  ('DKK', 'official',  205.1448,  205.2220,  205.2993, 'Central Bank of Nigeria', '2026-09-15');
