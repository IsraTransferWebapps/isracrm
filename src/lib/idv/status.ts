import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdentityVerification } from '@/types/database';

/**
 * Get the latest identity verification record for a client.
 * Used by the portal documents page and review page.
 */
export async function getVerificationForClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<IdentityVerification | null> {
  const { data, error } = await supabase
    .from('identity_verifications')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch verification status:', error);
    return null;
  }

  return data as IdentityVerification | null;
}
