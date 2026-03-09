import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DIDIT_API_URL = 'https://verification.didit.me/v3/session/';

/**
 * POST /api/idv/create-session
 * Creates a Didit verification session for the authenticated onboarding client.
 * Returns the session URL for the frontend SDK to open.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get the onboarding session
  const { data: session, error: sessionError } = await supabase
    .from('onboarding_sessions')
    .select('id, client_id, status')
    .eq('auth_user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Onboarding session not found' }, { status: 404 });
  }

  if (session.status === 'submitted' || session.status === 'under_review') {
    return NextResponse.json({ error: 'Application already submitted' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // 3. Check for existing non-terminal verification session
  const { data: existing } = await serviceClient
    .from('identity_verifications')
    .select('*')
    .eq('client_id', session.client_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If there's an existing completed verification, return it
  if (existing?.status === 'completed') {
    return NextResponse.json({
      sessionUrl: existing.didit_session_url,
      diditSessionId: existing.didit_session_id,
      status: 'completed',
      alreadyCompleted: true,
    });
  }

  // If there's a pending/in_progress session less than 30 minutes old, reuse it
  if (
    existing &&
    (existing.status === 'pending' || existing.status === 'in_progress') &&
    Date.now() - new Date(existing.created_at).getTime() < 30 * 60 * 1000
  ) {
    return NextResponse.json({
      sessionUrl: existing.didit_session_url,
      diditSessionId: existing.didit_session_id,
      status: existing.status,
      alreadyCompleted: false,
    });
  }

  // 4. Create a new Didit verification session
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) {
    console.error('DIDIT_API_KEY is not configured');
    return NextResponse.json({ error: 'IDV service not configured' }, { status: 500 });
  }

  // Build the callback URL — used when Didit redirects after verification
  const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
  const callbackUrl = `${origin}/portal/onboard/documents?verified=true`;

  let diditResponse: Response;
  try {
    diditResponse = await fetch(DIDIT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        callback: callbackUrl,
        // vendor_data lets us identify the client when the webhook fires
        vendor_data: JSON.stringify({
          client_id: session.client_id,
          onboarding_session_id: session.id,
        }),
      }),
    });
  } catch (err) {
    console.error('Failed to call Didit API:', err);
    return NextResponse.json({ error: 'Failed to create verification session' }, { status: 502 });
  }

  if (!diditResponse.ok) {
    const errorBody = await diditResponse.text();
    console.error('Didit API error:', diditResponse.status, errorBody);
    return NextResponse.json({ error: 'Verification service error' }, { status: 502 });
  }

  const diditData = await diditResponse.json();
  const diditSessionId = diditData.session_id || diditData.id;
  const sessionUrl = diditData.url;

  if (!diditSessionId || !sessionUrl) {
    console.error('Unexpected Didit response:', diditData);
    return NextResponse.json({ error: 'Invalid response from verification service' }, { status: 502 });
  }

  // 5. Store the verification session in our DB
  const { error: insertError } = await serviceClient
    .from('identity_verifications')
    .insert({
      client_id: session.client_id,
      session_id: session.id,
      didit_session_id: diditSessionId,
      didit_session_url: sessionUrl,
      status: 'pending',
    });

  if (insertError) {
    console.error('Failed to store verification session:', insertError);
    return NextResponse.json({ error: 'Failed to store verification session' }, { status: 500 });
  }

  return NextResponse.json({
    sessionUrl,
    diditSessionId,
    status: 'pending',
    alreadyCompleted: false,
  });
}
