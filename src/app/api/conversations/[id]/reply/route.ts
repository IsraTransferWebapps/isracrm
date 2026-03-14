import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { insertMessage } from '@/lib/messaging/utils';

/**
 * POST /api/conversations/[id]/reply
 * Staff sends a reply in a conversation. Message is routed back via the original channel.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;

  // Authenticate staff user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get staff user record
  const serviceClient = createServiceClient();
  const { data: staffUser } = await serviceClient
    .from('user_profiles')
    .select('id, full_name, email')
    .eq('id', user.id)
    .single();

  if (!staffUser) {
    return NextResponse.json({ error: 'Staff user not found' }, { status: 403 });
  }

  // Parse body
  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messageBody = body.body?.trim();
  if (!messageBody) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
  }

  if (messageBody.length > 5000) {
    return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
  }

  // Get conversation
  const { data: conversation } = await serviceClient
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Insert message
  const message = await insertMessage({
    conversationId,
    senderType: 'staff',
    senderId: staffUser.id,
    body: messageBody,
    channel: conversation.channel,
  });

  // Route reply via original channel
  if (conversation.channel === 'whatsapp' && conversation.external_id) {
    try {
      const { sendWhatsAppMessage } = await import('@/lib/messaging/twilio');
      const sid = await sendWhatsAppMessage(conversation.external_id, messageBody);
      // Store Twilio message SID on the message
      await serviceClient
        .from('messages')
        .update({ external_message_id: sid })
        .eq('id', message.id);
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
      // Message is saved in DB even if Twilio fails — staff can retry
    }
  }
  // For 'live_chat' and 'portal', Supabase Realtime handles delivery

  // Reset unread count since staff is actively replying
  await serviceClient
    .from('conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId);

  return NextResponse.json({ message }, { status: 201 });
}
