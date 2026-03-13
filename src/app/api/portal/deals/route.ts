import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/portal/deals
 * Book an FX deal from a valid (unexpired) rate quote.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  let body: { quote_id?: string; beneficiary_id?: string; payment_reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { quote_id, beneficiary_id, payment_reference } = body;

  if (!quote_id) {
    return NextResponse.json(
      { error: 'quote_id is required' },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // 1. Fetch the quote
  const { data: quote, error: quoteError } = await serviceClient
    .from('rate_quotes')
    .select('*')
    .eq('id', quote_id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json(
      { error: 'Quote not found' },
      { status: 404 }
    );
  }

  // 2. Verify ownership
  if (quote.client_id !== auth.clientId) {
    return NextResponse.json(
      { error: 'Quote does not belong to this client' },
      { status: 403 }
    );
  }

  // 3. Check expiry
  if (new Date(quote.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Quote has expired. Please request a new quote.' },
      { status: 410 }
    );
  }

  // 4. Check double-execution
  if (quote.executed) {
    return NextResponse.json(
      { error: 'Quote has already been executed' },
      { status: 409 }
    );
  }

  // 5. Validate beneficiary if provided
  if (beneficiary_id) {
    const { data: beneficiary } = await serviceClient
      .from('beneficiaries')
      .select('id, client_id')
      .eq('id', beneficiary_id)
      .is('deleted_at', null)
      .single();

    if (!beneficiary || beneficiary.client_id !== auth.clientId) {
      return NextResponse.json(
        { error: 'Invalid beneficiary' },
        { status: 400 }
      );
    }
  }

  // 6. Create the deal
  const now = new Date().toISOString();
  const { data: deal, error: dealError } = await serviceClient
    .from('deals')
    .insert({
      client_id: auth.clientId,
      deal_type: 'spot',
      status: 'booked',
      sell_currency: quote.sell_currency,
      sell_amount: quote.sell_amount,
      buy_currency: quote.buy_currency,
      buy_amount: quote.buy_amount,
      exchange_rate: quote.client_rate,
      interbank_rate: quote.interbank_rate,
      margin_percentage: quote.margin_percentage,
      margin_points: quote.margin_points,
      beneficiary_id: beneficiary_id || null,
      payment_reference: payment_reference || null,
      value_date: now,
      booked_at: now,
      status_history: [{ status: 'booked', timestamp: now, changed_by: 'portal' }],
    })
    .select('id, deal_reference, status, sell_currency, sell_amount, buy_currency, buy_amount, exchange_rate, booked_at')
    .single();

  if (dealError) {
    console.error('Failed to create deal:', dealError);
    return NextResponse.json(
      { error: 'Failed to book deal' },
      { status: 500 }
    );
  }

  // 7. Mark quote as executed
  await serviceClient
    .from('rate_quotes')
    .update({ executed: true, executed_deal_id: deal.id })
    .eq('id', quote_id);

  return NextResponse.json({
    deal_id: deal.id,
    deal_reference: deal.deal_reference,
    status: deal.status,
    sell_currency: deal.sell_currency,
    sell_amount: deal.sell_amount,
    buy_currency: deal.buy_currency,
    buy_amount: deal.buy_amount,
    exchange_rate: deal.exchange_rate,
    booked_at: deal.booked_at,
  });
}
