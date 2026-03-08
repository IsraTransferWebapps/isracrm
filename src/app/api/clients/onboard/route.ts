import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/clients/onboard
 * Called when a client submits their onboarding application.
 * Validates all sections are complete, updates statuses, and logs the submission.
 */
export async function POST() {
  const supabase = await createClient();

  // Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the onboarding session with related client
  const { data: session, error: sessionError } = await supabase
    .from('onboarding_sessions')
    .select('*, clients(*)')
    .eq('auth_user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Onboarding session not found' }, { status: 404 });
  }

  if (session.status === 'submitted' || session.status === 'under_review') {
    return NextResponse.json({ error: 'Application already submitted' }, { status: 400 });
  }

  const clientId = session.client_id;
  const clientType = session.client_type;

  // --- Validate all required sections ---
  const errors: string[] = [];

  // 1. KYC details
  if (clientType === 'corporate') {
    const { data: corp } = await supabase
      .from('corporate_details')
      .select('company_name, company_registration_number, country_of_incorporation, sanctions_consent')
      .eq('client_id', clientId)
      .single();

    if (!corp?.company_name || !corp?.company_registration_number || !corp?.country_of_incorporation) {
      errors.push('Corporate KYC details are incomplete');
    }
    if (!corp?.sanctions_consent) {
      errors.push('Sanctions consent is required');
    }
  } else {
    const { data: ind } = await supabase
      .from('individual_details')
      .select('first_name, last_name, date_of_birth, nationality, sanctions_consent')
      .eq('client_id', clientId)
      .single();

    if (!ind?.first_name || !ind?.last_name || !ind?.date_of_birth || !ind?.nationality) {
      errors.push('Individual KYC details are incomplete');
    }
    if (!ind?.sanctions_consent) {
      errors.push('Sanctions consent is required');
    }
  }

  // 2. At least one beneficiary
  const { count: beneficiaryCount } = await supabase
    .from('beneficiaries')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .is('deleted_at', null);

  if (!beneficiaryCount || beneficiaryCount < 1) {
    errors.push('At least one beneficiary is required');
  }

  // 3. FATCA declaration
  const { data: fatca } = await supabase
    .from('fatca_declarations')
    .select('self_certification')
    .eq('client_id', clientId)
    .single();

  if (!fatca?.self_certification) {
    errors.push('FATCA/CRS self-certification is required');
  }

  // 4. Required documents
  const { data: docs } = await supabase
    .from('kyc_documents')
    .select('document_type')
    .eq('client_id', clientId)
    .is('deleted_at', null);

  const uploadedTypes = new Set((docs || []).map((d) => d.document_type));

  if (clientType === 'corporate') {
    const requiredCorp = ['certificate_of_incorporation', 'company_registration', 'proof_of_address'];
    for (const t of requiredCorp) {
      if (!uploadedTypes.has(t)) errors.push(`Missing required document: ${t}`);
    }
  } else {
    const requiredInd = ['passport', 'proof_of_address'];
    for (const t of requiredInd) {
      if (!uploadedTypes.has(t)) errors.push(`Missing required document: ${t}`);
    }
  }

  // Return errors if validation fails
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  // --- All validations passed — submit the application ---
  const now = new Date().toISOString();

  // Update onboarding session status
  const { error: updateSessionErr } = await supabase
    .from('onboarding_sessions')
    .update({
      status: 'submitted',
      current_step: 'submitted',
      submitted_at: now,
    })
    .eq('id', session.id);

  if (updateSessionErr) {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }

  // Update client KYC status to in_review
  const { error: updateClientErr } = await supabase
    .from('clients')
    .update({
      kyc_status: 'in_review',
      onboarding_date: now,
    })
    .eq('id', clientId);

  if (updateClientErr) {
    console.error('Failed to update client status:', updateClientErr.message);
  }

  // Log the submission to crm_sync_log
  await supabase.from('crm_sync_log').insert({
    onboarding_session_id: session.id,
    client_id: clientId,
    sync_type: 'onboarding_submission',
    status: 'completed',
    payload: {
      submitted_at: now,
      client_type: clientType,
      beneficiary_count: beneficiaryCount,
      document_count: docs?.length || 0,
    },
  });

  // Create activity log entry
  await supabase.from('activity_logs').insert({
    client_id: clientId,
    log_type: 'system_event',
    subject: 'Onboarding application submitted',
    body: `Client completed self-service onboarding. Application is pending compliance review.`,
  });

  // Trigger admin notification (fire-and-forget)
  supabase.functions.invoke('notify-onboarding-submission', {
    body: {
      session_id: session.id,
      client_id: clientId,
      client_type: clientType,
      submitted_at: now,
    },
  }).catch((err) => {
    console.error('Failed to trigger notification:', err);
  });

  return NextResponse.json({
    success: true,
    message: 'Application submitted successfully',
    sessionId: session.id,
  });
}
