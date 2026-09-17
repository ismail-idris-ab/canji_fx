import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Currency, Market, Rate, RateSource } from '@/domain/types';

/**
 * The last payload Aboki Rate saw, kept so the app opens with rates rather than a
 * spinner on a weak connection.
 *
 * Rates and currencies are stored together as one payload. Caching them
 * separately would let a cold start pair rows from one fetch with figures
 * from another, which is a silent way to show a wrong number.
 *
 * Nothing here relabels age. Observed At is preserved exactly, so cached
 * Rates carry their real Freshness and can never be mistaken for live data.
 */

const KEY = 'aboki-rate.rates.v1';

type StoredRate = Omit<Rate, 'observedAt'> & { observedAt: string };

type StoredPayload = {
  version: 1;
  rates: StoredRate[];
  currencies: Currency[];
};

export type CachedPayload = {
  rates: Rate[];
  currencies: Currency[];
};

export async function readCache(): Promise<CachedPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed.version !== 1) return null;

    return {
      currencies: parsed.currencies,
      rates: parsed.rates.map((rate) => ({
        ...rate,
        market: rate.market as Market,
        sourceLabel: rate.sourceLabel as RateSource,
        observedAt: new Date(rate.observedAt),
      })),
    };
  } catch {
    // A corrupt or unreadable cache is not an error worth surfacing: the
    // network path is about to run anyway, and a Reader cannot act on it.
    return null;
  }
}

export async function writeCache(payload: CachedPayload): Promise<void> {
  try {
    const stored: StoredPayload = {
      version: 1,
      currencies: payload.currencies,
      rates: payload.rates.map((rate) => ({
        ...rate,
        observedAt: rate.observedAt.toISOString(),
      })),
    };

    await AsyncStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Failing to cache costs a spinner on the next cold start, nothing more.
  }
}
