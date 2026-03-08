import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    redirect('/onboard/register');
  }

  // Find the onboarding session for this user
  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('current_step, status')
    .eq('auth_user_id', user.id)
    .single();

  if (!session) {
    // No session found — user registered but something went wrong, send back to register
    redirect('/onboard/register');
  }

  // If already submitted, go to confirmation
  if (session.status === 'submitted' || session.status === 'under_review' || session.status === 'approved') {
    redirect('/onboard/confirmation');
  }

  // Redirect to the current step
  const route = STEP_ROUTES[session.current_step as OnboardingStep] || '/onboard/kyc';
  redirect(route);
}
