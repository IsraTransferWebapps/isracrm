import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

const DIDIT_DECISION_URL = 'https://verification.didit.me/v3/session';
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/webhooks/didit
 * Receives identity verification callbacks from Didit.
 * Authenticates via HMAC-SHA256 signature (no Supabase auth).
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('DIDIT_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // 1. Read the raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature-V2') || request.headers.get('x-signature-v2') || '';
  const timestamp = request.headers.get('X-Timestamp') || request.headers.get('x-timestamp') || '';

  // 2. Verify timestamp freshness
  const webhookTime = parseInt(timestamp, 10) * 1000; // Didit sends seconds, convert to ms
  if (isNaN(webhookTime) || Math.abs(Date.now() - webhookTime) > TIMESTAMP_TOLERANCE_MS) {
    console.warn('Webhook timestamp out of range:', timestamp);
    return NextResponse.json({ error: 'Invalid timestamp' }, { status: 401 });
  }

  // 3. Verify HMAC-SHA256 signature
  if (!verifySignature(rawBody, timestamp, signature, webhookSecret)) {
    console.warn('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 4. Parse the webhook payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const diditSessionId = payload.session_id as string;
  if (!diditSessionId) {
    console.warn('Webhook missing session_id:', payload);
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 5. Find the verification record
  const { data: verification, error: findError } = await supabase
    .from('identity_verifications')
    .select('*')
    .eq('didit_session_id', diditSessionId)
    .single();

  if (findError || !verification) {
    console.warn('Verification not found for Didit session:', diditSessionId);
    // Return 200 so Didit doesn't retry — the session might be from a different environment
    return NextResponse.json({ ok: true, message: 'Session not found' });
  }

  // 6. Idempotency — skip if already in a terminal state
  const terminalStatuses = ['completed', 'failed'];
  if (terminalStatuses.includes(verification.status)) {
    return NextResponse.json({ ok: true, message: 'Already processed' });
  }

  // 7. Map Didit status to our enum
  const diditStatus = (payload.status as string) || '';
  const statusMap: Record<string, string> = {
    'Not Started': 'pending',
    'In Progress': 'in_progress',
    'Approved': 'completed',
    'Declined': 'failed',
    'In Review': 'in_progress',
    'Abandoned': 'abandoned',
  };

  const mappedStatus = statusMap[diditStatus] || verification.status;
  const isTerminal = mappedStatus === 'completed' || mappedStatus === 'failed';
  const now = new Date().toISOString();

  // 8. Fetch full decision data from Didit if the status is terminal
  let decisionData: Record<string, unknown> | null = null;
  if (isTerminal) {
    try {
      decisionData = await fetchDecisionData(diditSessionId);
    } catch (err) {
      console.error('Failed to fetch Didit decision data:', err);
      // Continue anyway — we still update the status
    }
  }

  // 9. Build the update payload
  const updatePayload: Record<string, unknown> = {
    status: mappedStatus,
    webhook_received_at: now,
    raw_webhook_payload: payload,
  };

  if (isTerminal) {
    updatePayload.completed_at = now;
  }

  // Extract data from the decision response if available
  if (decisionData) {
    // ID verification results
    const idVerifications = decisionData.id_verifications as Array<Record<string, unknown>> | undefined;
    if (idVerifications && idVerifications.length > 0) {
      const idv = idVerifications[0];
      updatePayload.id_verification_result = idv;
      updatePayload.document_type = idv.document_type || null;
      updatePayload.document_number = idv.document_number || null;
      updatePayload.document_country = idv.issuing_state_name || idv.issuing_state || null;
      updatePayload.document_expiry_date = idv.expiration_date || null;
      updatePayload.full_name_extracted = idv.full_name || [idv.first_name, idv.last_name].filter(Boolean).join(' ') || null;
      updatePayload.date_of_birth_extracted = idv.date_of_birth || null;
    }

    // Liveness score
    const livenessChecks = decisionData.liveness_checks as Array<Record<string, unknown>> | undefined;
    if (livenessChecks && livenessChecks.length > 0) {
      updatePayload.liveness_score = livenessChecks[0].score ?? null;
    }

    // Face match score
    const faceMatches = decisionData.face_matches as Array<Record<string, unknown>> | undefined;
    if (faceMatches && faceMatches.length > 0) {
      updatePayload.face_match_score = faceMatches[0].score ?? null;
    }

    // AML screening
    const amlScreenings = decisionData.aml_screenings as Array<Record<string, unknown>> | undefined;
    if (amlScreenings && amlScreenings.length > 0) {
      updatePayload.aml_screening_result = amlScreenings;
      const totalHits = amlScreenings.reduce((sum, s) => sum + ((s.total_hits as number) || 0), 0);
      updatePayload.aml_hit = totalHits > 0;
    }
  }

  // 10. Update the verification record
  const { error: updateError } = await supabase
    .from('identity_verifications')
    .update(updatePayload)
    .eq('id', verification.id);

  if (updateError) {
    console.error('Failed to update verification:', updateError);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Verify HMAC-SHA256 signature from Didit webhook.
 */
function verifySignature(body: string, timestamp: string, signature: string, secret: string): boolean {
  const payload = `${timestamp}.${body}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Fetch the full decision/results for a completed session from Didit.
 */
async function fetchDecisionData(sessionId: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) throw new Error('DIDIT_API_KEY not configured');

  const res = await fetch(`${DIDIT_DECISION_URL}/${sessionId}/decision/`, {
    headers: { 'x-api-key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`Didit decision API returned ${res.status}`);
  }

  return res.json();
}
