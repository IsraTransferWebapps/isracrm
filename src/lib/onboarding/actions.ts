'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ClientType, OnboardingStep } from '@/types/database';

/**
 * Create a new onboarding client record and session after Supabase Auth signup.
 * Uses service role to bypass RLS — the user's auth session may not be
 * propagated to the server action immediately after signUp().
 */
export async function createOnboardingClient(
  userId: string,
  clientType: ClientType,
  email: string
): Promise<{ clientId: string; sessionId: string }> {
  const supabase = createServiceClient();

  // Create the client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      client_type: clientType,
      status: 'prospect',
      auth_user_id: userId,
      kyc_status: 'pending',
      source_of_funds_status: 'not_submitted',
    })
    .select('id')
    .single();

  if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);

  // Create the detail row depending on client type
  if (clientType === 'corporate') {
    const { error: corpError } = await supabase
      .from('corporate_details')
      .insert({ client_id: client.id, company_name: '' });

    if (corpError) throw new Error(`Failed to create corporate details: ${corpError.message}`);
  } else {
    const { error: indError } = await supabase
      .from('individual_details')
      .insert({
        client_id: client.id,
        first_name: '',
        last_name: '',
        email_primary: email,
      });

    if (indError) throw new Error(`Failed to create individual details: ${indError.message}`);
  }

  // Create the onboarding session
  const { data: session, error: sessionError } = await supabase
    .from('onboarding_sessions')
    .insert({
      client_id: client.id,
      auth_user_id: userId,
      client_type: clientType,
      current_step: 'kyc' as OnboardingStep,
      status: 'in_progress',
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sessionError) throw new Error(`Failed to create session: ${sessionError.message}`);

  return { clientId: client.id, sessionId: session.id };
}

/**
 * Update the current step and optionally save draft data.
 */
export async function updateOnboardingStep(
  sessionId: string,
  step: OnboardingStep,
  stepData?: Record<string, unknown>
) {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = { current_step: step };

  if (stepData) {
    // Merge new step_data with existing
    const { data: existing } = await supabase
      .from('onboarding_sessions')
      .select('step_data')
      .eq('id', sessionId)
      .single();

    updatePayload.step_data = {
      ...(existing?.step_data as Record<string, unknown> || {}),
      ...stepData,
    };
  }

  const { error } = await supabase
    .from('onboarding_sessions')
    .update(updatePayload)
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update step: ${error.message}`);
}

/**
 * Get the current onboarding session for the authenticated user.
 */
export async function getOnboardingSession() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('*, clients(*)')
    .eq('auth_user_id', user.id)
    .single();

  return session;
}

