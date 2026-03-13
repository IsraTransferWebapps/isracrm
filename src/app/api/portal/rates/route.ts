import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { getQuotedRate } from '@/lib/portal/rate-engine';
import { isSupportedCurrency } from '@/lib/portal/xe-client';
import { createServiceClient } from '@/lib/supabase/server';

const QUOTE_EXPIRY_SECONDS = Number(process.env.QUOTE_EXPIRY_SECONDS ?? '30');

/**
 * GET /api/portal/rates
 * Fetch a live FX rate quote for the authenticated client.
 * Creates a rate_quote record with a 30-second expiry.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const sellCurrency = searchParams.get('sell_currency')?.toUpperCase();
  const buyCurrency = searchParams.get('buy_currency')?.toUpperCase();
  const sellAmountStr = searchParams.get('sell_amount');

  // Validate params
  if (!sellCurrency || !buyCurrency || !sellAmountStr) {
    return NextResponse.json(
      { error: 'sell_currency, buy_currency, and sell_amount are required' },
      { status: 400 }
    );
  }

  if (!isSupportedCurrency(sellCurrency) || !isSupportedCurrency(buyCurrency)) {
    return NextResponse.json(
      { error: 'Unsupported currency. Supported: GBP, ILS, USD, EUR' },
      { status: 400 }
    );
  }

  if (sellCurrency === buyCurrency) {
    return NextResponse.json(
      { error: 'Sell and buy currencies must be different' },
      { status: 400 }
    );
  }

  const sellAmount = parseInt(sellAmountStr, 10);
  if (isNaN(sellAmount) || sellAmount <= 0) {
    return NextResponse.json(
      { error: 'sell_amount must be a positive integer (minor units)' },
      { status: 400 }
    );
  }

  try {
    const quote = await getQuotedRate(
      auth.clientId,
      sellCurrency,
      buyCurrency,
      sellAmount
    );

    const expiresAt = new Date(
      Date.now() + QUOTE_EXPIRY_SECONDS * 1000
    ).toISOString();

    // Persist the quote for audit trail and execution
    const serviceClient = createServiceClient();
    const { data: quoteRecord, error: insertError } = await serviceClient
      .from('rate_quotes')
      .insert({
        client_id: auth.clientId,
        sell_currency: sellCurrency,
        buy_currency: buyCurrency,
        sell_amount: sellAmount,
        buy_amount: quote.buyAmount,
        interbank_rate: quote.interbankRate,
        margin_percentage: quote.marginPercentage,
        margin_points: quote.marginPoints,
        client_rate: quote.clientRate,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert rate quote:', insertError);
      return NextResponse.json(
        { error: 'Failed to create quote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quote_id: quoteRecord.id,
      sell_currency: sellCurrency,
      buy_currency: buyCurrency,
      sell_amount: sellAmount,
      buy_amount: quote.buyAmount,
      rate: quote.clientRate,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('Rate quote error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
