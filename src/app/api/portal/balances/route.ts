import { NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/balances
 * Fetch the latest balance per currency for the authenticated client.
 */
export async function GET() {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const serviceClient = createServiceClient();

  // Get the most recent ledger entry per currency for running balance
  const { data, error } = await serviceClient.rpc('get_client_balances', {
    p_client_id: auth.clientId,
  });

  // If the RPC doesn't exist, fall back to a manual query
  if (error) {
    // Distinct currencies with latest running_balance
    const { data: entries, error: fallbackError } = await serviceClient
      .from('ledger_entries')
      .select('currency, running_balance, created_at')
      .eq('client_id', auth.clientId)
      .order('created_at', { ascending: false });

    if (fallbackError) {
      console.error('Failed to fetch balances:', fallbackError);
      return NextResponse.json(
        { error: 'Failed to fetch balances' },
        { status: 500 }
      );
    }

    // Group by currency, take the latest entry per currency
    const balanceMap = new Map<string, number>();
    for (const entry of entries ?? []) {
      if (!balanceMap.has(entry.currency)) {
        balanceMap.set(entry.currency, entry.running_balance);
      }
    }

    const balances = Array.from(balanceMap.entries()).map(([currency, balance]) => ({
      currency,
      balance,
    }));

    return NextResponse.json({ balances });
  }

  return NextResponse.json({ balances: data });
}
