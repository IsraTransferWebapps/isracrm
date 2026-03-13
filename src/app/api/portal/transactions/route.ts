import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/transactions
 * Fetch paginated deal history for the authenticated client.
 * Excludes internal margin/interbank data.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const status = searchParams.get('status');
  const currency = searchParams.get('currency');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  const serviceClient = createServiceClient();
  const offset = (page - 1) * limit;

  let query = serviceClient
    .from('deals')
    .select(
      'id, deal_reference, deal_type, status, sell_currency, sell_amount, buy_currency, buy_amount, exchange_rate, value_date, beneficiary_id, payment_reference, booked_at, completed_at, created_at, beneficiary:beneficiaries(nickname, beneficiary_name)',
      { count: 'exact' }
    )
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (currency) {
    // Filter by either sell or buy currency
    query = query.or(`sell_currency.eq.${currency},buy_currency.eq.${currency}`);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deals: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
