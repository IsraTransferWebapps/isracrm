import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ComplianceReviewAction } from '@/types/database';

interface ReviewBody {
  action: ComplianceReviewAction;
  notes?: string;
}

/**
 * POST /api/leads/[id]/review
 * Compliance review endpoint: approve, reject, or return a lead application.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  // Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the user has compliance/management role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || (profile.role !== 'compliance_officer' && profile.role !== 'management')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Parse request body
  let body: ReviewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, notes } = body;

  if (!['approve', 'reject', 'return'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Must be: approve, reject, or return' }, { status: 400 });
  }

  if ((action === 'reject' || action === 'return') && (!notes || !notes.trim())) {
    return NextResponse.json({ error: 'Notes are required for reject and return actions' }, { status: 400 });
  }

  // Fetch the client and their onboarding session
  const { data: client } = await supabase
    .from('clients')
    .select('id, status')
    .eq('id', clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('id, status')
    .eq('client_id', clientId)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Onboarding session not found' }, { status: 404 });
  }

  // Validate session is in a reviewable state
  if (session.status !== 'submitted' && session.status !== 'under_review') {
    return NextResponse.json(
      { error: `Cannot review an application with status: ${session.status}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Get client email for notifications
  const { data: details } = await supabase
    .from('individual_details')
    .select('email_primary')
    .eq('client_id', clientId)
    .single();

  const clientEmail = details?.email_primary || null;

  // Execute the action
  switch (action) {
    case 'approve': {
      // Update onboarding session
      await supabase.from('onboarding_sessions').update({
        status: 'approved',
        reviewed_by: profile.id,
        review_notes: notes || 'Approved',
      }).eq('id', session.id);

      // Promote client to active
      await supabase.from('clients').update({
        status: 'active',
        kyc_status: 'approved',
      }).eq('id', clientId);

      // Activity log
      await supabase.from('activity_logs').insert({
        client_id: clientId,
        log_type: 'compliance_event',
        subject: 'Onboarding application approved',
        body: `Application approved by compliance.${notes ? ` Notes: ${notes}` : ''}`,
        created_by: profile.id,
      });

      // Send approval notification (fire-and-forget)
      if (clientEmail) {
        supabase.functions.invoke('notify-lead-review', {
          body: { client_id: clientId, action: 'approve', email: clientEmail, notes },
        }).catch((err) => console.error('Notification failed:', err));
      }

      return NextResponse.json({ success: true, message: 'Application approved' });
    }

    case 'reject': {
      await supabase.from('onboarding_sessions').update({
        status: 'rejected',
        reviewed_by: profile.id,
        review_notes: notes,
      }).eq('id', session.id);

      await supabase.from('clients').update({
        status: 'closed',
        kyc_status: 'rejected',
      }).eq('id', clientId);

      await supabase.from('activity_logs').insert({
        client_id: clientId,
        log_type: 'compliance_event',
        subject: 'Onboarding application rejected',
        body: `Application rejected by compliance. Reason: ${notes}`,
        created_by: profile.id,
      });

      if (clientEmail) {
        supabase.functions.invoke('notify-lead-review', {
          body: { client_id: clientId, action: 'reject', email: clientEmail, notes },
        }).catch((err) => console.error('Notification failed:', err));
      }

      return NextResponse.json({ success: true, message: 'Application rejected' });
    }

    case 'return': {
      await supabase.from('onboarding_sessions').update({
        status: 'returned',
        reviewed_by: profile.id,
        review_notes: notes,
        returned_at: now,
        current_step: 'kyc', // Reset to first step so they can re-edit
      }).eq('id', session.id);

      await supabase.from('clients').update({
        kyc_status: 'pending',
      }).eq('id', clientId);

      await supabase.from('activity_logs').insert({
        client_id: clientId,
        log_type: 'compliance_event',
        subject: 'Application returned for corrections',
        body: `Application returned for corrections. Notes: ${notes}`,
        created_by: profile.id,
      });

      if (clientEmail) {
        supabase.functions.invoke('notify-lead-review', {
          body: { client_id: clientId, action: 'return', email: clientEmail, notes },
        }).catch((err) => console.error('Notification failed:', err));
      }

      return NextResponse.json({ success: true, message: 'Application returned for corrections' });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
