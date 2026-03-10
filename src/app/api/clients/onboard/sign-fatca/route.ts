import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/clients/onboard/sign-fatca
 *
 * Called when a client signs the FATCA declaration.
 * Records the signature metadata (IP address, user agent) server-side
 * for compliance audit trail purposes.
 *
 * Body: { signature_image: string }  (the storage path)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const signatureImage = body.signature_image;

  if (!signatureImage || typeof signatureImage !== 'string') {
    return NextResponse.json({ error: 'signature_image is required' }, { status: 400 });
  }

  // Get the client ID from the onboarding session
  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Onboarding session not found' }, { status: 404 });
  }

  // Extract IP address from request headers
  // Netlify/Cloudflare/Vercel set x-forwarded-for; fallback to x-real-ip
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Update the FATCA declaration with signing metadata
  const { error: updateError } = await supabase
    .from('fatca_declarations')
    .update({
      signature_image: signatureImage,
      signature_ip: ip,
      signature_user_agent: userAgent,
      signed_by: user.user_metadata?.full_name || user.email || user.id,
      declaration_date: new Date().toISOString(),
    })
    .eq('client_id', session.client_id);

  if (updateError) {
    console.error('Failed to update FATCA signing metadata:', updateError.message);
    return NextResponse.json({ error: 'Failed to record signing metadata' }, { status: 500 });
  }

  return NextResponse.json({ success: true, ip });
}
