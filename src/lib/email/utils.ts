// ============================================================
// Shared email utilities used by both inbound and outbound routes
// ============================================================

import type { createServiceClient } from '@/lib/supabase/server';

/**
 * Strip Re:/Fwd:/Fw: prefixes from subject for thread matching.
 * Handles any depth of nested prefixes (e.g. "Re: Re: Fwd: Re: Subject").
 */
export function normalizeSubject(subject: string): string {
  return subject.replace(/^((re|fwd?|fw)\s*:\s*)+/gi, '').trim();
}

/**
 * Generate a short snippet (~120 chars) from email body text for list previews.
 */
export function generateSnippet(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/\s+/g, ' ').trim().substring(0, 120);
}

/**
 * Escape a plain-text string for safe embedding in HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Find a client by their email address.
 * Checks individual_details (primary + secondary) and corporate_details (custom_data).
 * Uses a combined OR query for individual lookups to avoid N+1 queries.
 */
export async function findClientByEmail(
  supabase: ReturnType<typeof createServiceClient>,
  email: string
): Promise<string | null> {
  // Check individual_details — combined query for primary + secondary email
  const { data: individual } = await supabase
    .from('individual_details')
    .select('client_id')
    .or(`email_primary.ilike.${email},email_secondary.ilike.${email}`)
    .limit(1)
    .maybeSingle();

  if (individual) return individual.client_id;

  // Check corporate_details — search in custom_data for contact emails
  const { data: corporate } = await supabase
    .from('corporate_details')
    .select('client_id')
    .or(`custom_data->>contact_email.ilike.${email},custom_data->>email.ilike.${email}`)
    .limit(1)
    .maybeSingle();

  if (corporate) return corporate.client_id;

  return null;
}
