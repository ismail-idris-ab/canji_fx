-- Reference data: the Quoted Currencies Canji reports, and the mapping from
-- the CBN feed's labels to their codes.
--
-- The ten currencies with has_official = true are those the CBN actually
-- publishes, verified against its live feed. CAD is included because it is
-- genuinely traded on the Nigerian street, but the CBN does not publish it,
-- so it can never carry an Official Market Rate or a Gap.
--
-- CFA, WAUA and SDR appear in the CBN feed and are deliberately absent here:
-- the latter two are accounting units rather than spendable money.

insert into public.currencies
  (code, name, flag_emoji, sort_order, tracked_parallel, has_official)
values
  ('USD', 'US Dollar',        '🇺🇸',  1, true,  true),
  ('GBP', 'Pound Sterling',   '🇬🇧',  2, true,  true),
  ('EUR', 'Euro',             '🇪🇺',  3, true,  true),
  ('CAD', 'Canadian Dollar',  '🇨🇦',  4, true,  false),
  ('CNY', 'Chinese Yuan',     '🇨🇳',  5, false, true),
  ('AED', 'UAE Dirham',       '🇦🇪',  6, false, true),
  ('ZAR', 'South African Rand','🇿🇦', 7, false, true),
  ('SAR', 'Saudi Riyal',      '🇸🇦',  8, false, true),
  ('CHF', 'Swiss Franc',      '🇨🇭',  9, false, true),
  ('JPY', 'Japanese Yen',     '🇯🇵', 10, false, true),
  ('DKK', 'Danish Krone',     '🇩🇰', 11, false, true);

-- Labels as they appear in the CBN feed, already trimmed and upper-cased.
-- Both spellings of the pound are present because the feed has used each of
-- them across its history.
--
-- RIYAL is mapped to SAR on the basis of the CBN's historical listing. The
-- label itself is ambiguous between the Saudi and Qatari riyal; this
-- assumption is recorded here rather than left silent, and should be
-- confirmed against a CBN publication before SAR is surfaced prominently.
insert into public.currency_source_labels (upstream_label, currency_code)
values
  ('US DOLLAR',          'USD'),
  ('POUNDS STERLING',    'GBP'),
  ('POUND STERLING',     'GBP'),
  ('EURO',               'EUR'),
  ('SWISS FRANC',        'CHF'),
  ('YEN',                'JPY'),
  ('YUAN/RENMINBI',      'CNY'),
  ('SOUTH AFRICAN RAND', 'ZAR'),
  ('UAE DIRHAM',         'AED'),
  ('RIYAL',              'SAR'),
  ('DANISH KRONA',       'DKK');
