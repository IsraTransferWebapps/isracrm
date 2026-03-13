import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PortalDashboard } from '@/components/portal/portal-dashboard';

/**
 * Portal hub — routes clients to the correct section:
 * - No session → register
 * - Onboarding in progress → onboarding step router
 * - Onboarding complete but not active → confirmation
 * - Active client → dashboard
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
    .select('status, client_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!session) {
    // No session found — sign out to clear stale session and send to register
    await supabase.auth.signOut();
    redirect('/portal/register');
  }

  // Returned for corrections or still in progress → onboarding step router
  if (session.status === 'in_progress' || session.status === 'returned') {
    redirect('/portal/onboard');
  }

  // Check if client is fully active
  if (session.status === 'approved' && session.client_id) {
    const { data: client } = await serviceClient
      .from('clients')
      .select('status')
      .eq('id', session.client_id)
      .single();

    if (client?.status === 'active') {
      return <PortalDashboard />;
    }
  }

  // Submitted, under review, rejected, or approved but not yet activated
  redirect('/portal/onboard/confirmation');
}
