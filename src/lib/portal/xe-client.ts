/**
 * XE Currency Data API client.
 * Fetches live interbank rates with in-memory caching (10s TTL).
 */

const XE_API_BASE = 'https://xecdapi.xe.com/v1';
const CACHE_TTL_MS = 10_000; // 10 seconds

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

// Simple in-memory rate cache — avoids hammering XE on rapid re-quotes
const rateCache = new Map<string, CachedRate>();

function getAuthHeader(): string {
  const accountId = process.env.XE_ACCOUNT_ID;
  const apiKey = process.env.XE_API_KEY;
  if (!accountId || !apiKey) {
    throw new Error('XE_ACCOUNT_ID and XE_API_KEY must be set');
  }
  return 'Basic ' + Buffer.from(`${accountId}:${apiKey}`).toString('base64');
}

/**
 * Fetch the interbank mid-market rate for a currency pair from XE.
 * Returns the rate as a number (e.g., 4.5123 for GBP/ILS).
 */
export async function fetchInterbankRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const cacheKey = `${fromCurrency}/${toCurrency}`;

  // Check cache
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  const url = `${XE_API_BASE}/convert_from.json?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}&amount=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`XE API error (${response.status}): ${body}`);
  }

  const data = await response.json();

  // XE returns: { to: [{ quotecurrency: "ILS", mid: 4.5123 }] }
  const toEntry = data.to?.[0];
  if (!toEntry?.mid) {
    throw new Error(`Unexpected XE response format: ${JSON.stringify(data)}`);
  }

  const rate = Number(toEntry.mid);

  // Cache the rate
  rateCache.set(cacheKey, { rate, fetchedAt: Date.now() });

  // Also cache the inverse
  const inverseKey = `${toCurrency}/${fromCurrency}`;
  if (!rateCache.has(inverseKey) || Date.now() - rateCache.get(inverseKey)!.fetchedAt >= CACHE_TTL_MS) {
    rateCache.set(inverseKey, { rate: 1 / rate, fetchedAt: Date.now() });
  }

  return rate;
}

/** Supported currencies for the portal */
export const SUPPORTED_CURRENCIES = ['GBP', 'ILS', 'USD', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(val: string): val is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(val);
}
