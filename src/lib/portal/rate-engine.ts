import { createServiceClient } from '@/lib/supabase/server';
import { fetchInterbankRate } from './xe-client';
import type { ClientMarginConfig } from '@/types/database';

interface QuoteResult {
  interbankRate: number;
  clientRate: number;
  buyAmount: number; // minor units
  marginPercentage: number;
  marginPoints: number;
}

const DEFAULT_MARGIN_PERCENTAGE = Number(
  process.env.DEFAULT_MARGIN_PERCENTAGE ?? '1.0'
);

/**
 * Get a quoted rate for a client's FX conversion.
 * Fetches interbank rate from XE, looks up client margin config,
 * applies spread, and calculates the buy amount.
 *
 * @param clientId - The client's UUID
 * @param sellCurrency - e.g. "GBP"
 * @param buyCurrency - e.g. "ILS"
 * @param sellAmountMinor - Amount to sell in minor units (pence)
 */
export async function getQuotedRate(
  clientId: string,
  sellCurrency: string,
  buyCurrency: string,
  sellAmountMinor: number
): Promise<QuoteResult> {
  // 1. Fetch interbank rate from XE
  const interbankRate = await fetchInterbankRate(sellCurrency, buyCurrency);

  // 2. Look up client-specific margin config
  const serviceClient = createServiceClient();
  const currencyPair = `${sellCurrency}/${buyCurrency}`;

  const { data: marginConfig } = await serviceClient
    .from('client_margin_configs')
    .select('*')
    .eq('client_id', clientId)
    .eq('currency_pair', currencyPair)
    .eq('is_active', true)
    .single();

  const config = marginConfig as ClientMarginConfig | null;

  // 3. Apply margin
  // The margin reduces the rate for the client (they get less per unit sold)
  const marginPercentage = config?.margin_percentage ?? DEFAULT_MARGIN_PERCENTAGE;
  const marginMultiplier = 1 - marginPercentage / 100;
  const clientRate = interbankRate * marginMultiplier;

  // Calculate margin in points (difference in rate)
  const marginPoints = interbankRate - clientRate;

  // 4. Calculate buy amount in minor units
  // sell_amount (minor) * rate = buy_amount (minor)
  // Since both are in minor units (pence → agorot), the rate converts directly
  const buyAmountRaw = sellAmountMinor * clientRate;
  const buyAmount = Math.round(buyAmountRaw);

  return {
    interbankRate,
    clientRate,
    buyAmount,
    marginPercentage,
    marginPoints,
  };
}
