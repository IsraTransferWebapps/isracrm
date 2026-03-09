import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Portal hub — routes clients to the correct section:
 * - No session → register
 * - Onboarding in progress → onboarding step router
 * - Onboarding complete → confirmation (future: account dashboard)
 */
export default async function PortalHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/portal/register');
  }

  // Use service role to query the session — avoids RLS timing issues
  const serviceClient = createServiceClient();
  const { data: session } = await serviceClient
    .from('onboarding_sessions')
    .select('status')
    .eq('auth_user_id', user.id)
    .single();

  if (!session) {
    // No session found — sign out to clear stale session and send to register
    await supabase.auth.signOut();
    redirect('/portal/register');
  }

  // Completed onboarding → confirmation (future: /portal/account)
  if (session.status === 'submitted' || session.status === 'under_review' || session.status === 'approved') {
    redirect('/portal/onboard/confirmation');
  }

  // Onboarding in progress → onboarding step router
  redirect('/portal/onboard');
}
