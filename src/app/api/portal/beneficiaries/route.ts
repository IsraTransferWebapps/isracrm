import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/beneficiaries
 * List all non-deleted beneficiaries for the authenticated client.
 */
export async function GET() {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('beneficiaries')
    .select('id, nickname, beneficiary_name, bank_name, bank_country, account_number, iban, sort_code, bic_swift, currency, relationship_to_client, verified, created_at')
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch beneficiaries:', error);
    return NextResponse.json({ error: 'Failed to fetch beneficiaries' }, { status: 500 });
  }

  return NextResponse.json({ beneficiaries: data ?? [] });
}

/**
 * POST /api/portal/beneficiaries
 * Add a new beneficiary for the authenticated client.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { beneficiary_name, bank_name, bank_country, account_number, iban, sort_code, bic_swift, currency, relationship_to_client, nickname } = body as Record<string, string>;

  if (!beneficiary_name) {
    return NextResponse.json({ error: 'beneficiary_name is required' }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('beneficiaries')
    .insert({
      client_id: auth.clientId,
      beneficiary_name,
      nickname: nickname || null,
      bank_name: bank_name || null,
      bank_country: bank_country || null,
      account_number: account_number || null,
      iban: iban || null,
      sort_code: sort_code || null,
      bic_swift: bic_swift || null,
      currency: currency || null,
      relationship_to_client: relationship_to_client || null,
      verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create beneficiary:', error);
    return NextResponse.json({ error: 'Failed to create beneficiary' }, { status: 500 });
  }

  return NextResponse.json({ beneficiary: data }, { status: 201 });
}

/**
 * PUT /api/portal/beneficiaries
 * Update an existing beneficiary.
 */
export async function PUT(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, ...updates } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Verify ownership
  const { data: existing } = await serviceClient
    .from('beneficiaries')
    .select('client_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!existing || existing.client_id !== auth.clientId) {
    return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 });
  }

  // Only allow updating safe fields
  const allowedFields = ['nickname', 'beneficiary_name', 'bank_name', 'bank_country', 'account_number', 'iban', 'sort_code', 'bic_swift', 'currency', 'relationship_to_client'];
  const safeUpdates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      safeUpdates[key] = updates[key];
    }
  }

  const { data, error } = await serviceClient
    .from('beneficiaries')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update beneficiary:', error);
    return NextResponse.json({ error: 'Failed to update beneficiary' }, { status: 500 });
  }

  return NextResponse.json({ beneficiary: data });
}

/**
 * DELETE /api/portal/beneficiaries
 * Soft-delete a beneficiary (set deleted_at).
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Verify ownership
  const { data: existing } = await serviceClient
    .from('beneficiaries')
    .select('client_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!existing || existing.client_id !== auth.clientId) {
    return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 });
  }

  const { error } = await serviceClient
    .from('beneficiaries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to delete beneficiary:', error);
    return NextResponse.json({ error: 'Failed to delete beneficiary' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
