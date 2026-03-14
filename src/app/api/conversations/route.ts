import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/conversations
 * List conversations with filtering. Staff sees assigned + unassigned.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: staffUser } = await serviceClient
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!staffUser) {
    return NextResponse.json({ error: 'Staff user not found' }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'all';
  const channel = searchParams.get('channel');
  const status = searchParams.get('status');

  let query = serviceClient
    .from('conversations')
    .select(
      '*, client:clients(id, client_type, individual_details, corporate_details), assigned_staff:user_profiles!conversations_assigned_to_fkey(id, full_name, email)'
    )
    .order('last_message_at', { ascending: false })
    .limit(100);

  // Apply filters
  if (filter === 'mine') {
    query = query.eq('assigned_to', staffUser.id);
  } else if (filter === 'unassigned') {
    query = query.is('assigned_to', null);
  } else if (filter === 'unanswered') {
    query = query.eq('status', 'waiting_on_staff');
  }

  if (channel) {
    query = query.eq('channel', channel);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // Exclude closed by default unless explicitly requested
  if (status !== 'closed') {
    query = query.neq('status', 'closed');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}
