import { NextRequest, NextResponse } from 'next/server';
import { authenticatePortalRequest, isAuthError } from '@/lib/portal/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/messages
 * Fetch all messages for the authenticated client's portal conversation.
 */
export async function GET() {
  const auth = await authenticatePortalRequest();
  if (isAuthError(auth)) return auth;

  const serviceClient = createServiceClient();

  // Find the client's portal conversation
  const { data: conversation } = await serviceClient
    .from('conversations')
    .select('id')
    .eq('client_id', auth.clientId)
    .eq('channel', 'portal')
    .neq('status', 'closed')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ messages: [], conversationId: null });
  }

  const { data, error } = await serviceClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  // Mark unread staff messages as read
  await serviceClient
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'staff')
    .eq('is_read', false);

  return NextResponse.json({ messages: data ?? [], conversationId: conversation.id });
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

  const { findOrCreateConversation, insertMessage } = await import('@/lib/messaging/utils');

  const conversation = await findOrCreateConversation({
    clientId: auth.clientId,
    channel: 'portal',
  });

  const message = await insertMessage({
    conversationId: conversation.id,
    senderType: 'client',
    senderId: auth.user.id,
    body: messageBody,
    channel: 'portal',
  });

  return NextResponse.json({ message }, { status: 201 });
}
