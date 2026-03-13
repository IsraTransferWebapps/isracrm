import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Client } from '@/types/database';

interface PortalAuthResult {
  user: { id: string; email: string };
  clientId: string;
  client: Client;
}

/**
 * Authenticate a portal API request.
 * Verifies the Supabase session, resolves the client record,
 * and confirms the client is active.
 *
 * Returns the user, clientId, and client record on success.
 * Returns a NextResponse error on failure (401/403).
 */
export async function authenticatePortalRequest(): Promise<
  PortalAuthResult | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Use service client to bypass RLS and get the full client record
  const serviceClient = createServiceClient();
  const { data: client, error: clientError } = await serviceClient
    .from('clients')
    .select('*')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (clientError || !client) {
    return NextResponse.json(
      { error: 'Client record not found' },
      { status: 403 }
    );
  }

  if (client.status !== 'active') {
    return NextResponse.json(
      { error: 'Account is not active' },
      { status: 403 }
    );
  }

  return {
    user: { id: user.id, email: user.email ?? '' },
    clientId: client.id,
    client: client as Client,
  };
}

/** Type guard: true if result is an error response */
export function isAuthError(
  result: PortalAuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
