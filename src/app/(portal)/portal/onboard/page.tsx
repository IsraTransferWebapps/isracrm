import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { STEP_ROUTES } from '@/lib/onboarding/constants';
import type { OnboardingStep } from '@/types/database';

/**
 * Onboarding hub — fetches the session and redirects to the correct step.
 */
export default async function OnboardingHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/portal/register');
  }

  // Use service role to query the session — avoids RLS timing issues
  // after signup where the client's auth cookies may not yet propagate.
  const serviceClient = createServiceClient();
  const { data: session } = await serviceClient
    .from('onboarding_sessions')
    .select('current_step, status')
    .eq('auth_user_id', user.id)
    .single();

  if (!session) {
    // No session found — sign out to clear stale session and send to register
    await supabase.auth.signOut();
    redirect('/portal/register');
  }

  // Submitted/reviewed → confirmation page
  if (session.status === 'submitted' || session.status === 'under_review' || session.status === 'approved' || session.status === 'rejected') {
    redirect('/portal/onboard/confirmation');
  }

  // Returned for corrections → re-enter onboarding at the current step (reset to kyc)
  // In-progress → continue where they left off
  const route = STEP_ROUTES[session.current_step as OnboardingStep] || '/portal/onboard/kyc';
  redirect(route);
}
