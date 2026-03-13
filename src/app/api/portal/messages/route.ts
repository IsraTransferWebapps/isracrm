import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/messages
 * Fetch all messages for the authenticated client.
 */
export async function GET() {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('portal_messages')
    .select('*')
    .eq('client_id', auth.clientId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  // Mark unread staff messages as read
  await serviceClient
    .from('portal_messages')
    .update({ is_read: true })
    .eq('client_id', auth.clientId)
    .eq('sender_type', 'staff')
    .eq('is_read', false);

  return NextResponse.json({ messages: data ?? [] });
}

/**
 * POST /api/portal/messages
 * Send a new message from the client to their account manager.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messageBody = body.body?.trim();
  if (!messageBody) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
  }

  if (messageBody.length > 5000) {
    return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('portal_messages')
    .insert({
      client_id: auth.clientId,
      sender_type: 'client',
      sender_id: auth.user.id,
      body: messageBody,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ message: data }, { status: 201 });
}
