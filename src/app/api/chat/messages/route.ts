import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { insertMessage } from '@/lib/messaging/utils';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CHAT_WIDGET_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/chat/messages
 * Visitor sends a message from the live chat widget.
 */
export async function POST(request: NextRequest) {
  let body: { conversation_id?: string; body?: string; session_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!body.conversation_id || !body.body?.trim()) {
    return NextResponse.json(
      { error: 'conversation_id and body are required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (body.body.length > 5000) {
    return NextResponse.json(
      { error: 'Message too long' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Verify the session_token matches the conversation
  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, external_id')
    .eq('id', body.conversation_id)
    .eq('channel', 'live_chat')
    .single();

  if (!conversation || conversation.external_id !== body.session_token) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const message = await insertMessage({
    conversationId: body.conversation_id,
    senderType: 'client',
    body: body.body.trim(),
    channel: 'live_chat',
  });

  return NextResponse.json({ message }, { status: 201, headers: CORS_HEADERS });
}

/**
 * GET /api/chat/messages?conversation_id=...&session_token=...
 * Fetch messages for a chat session (polling fallback for widget).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversation_id');
  const sessionToken = searchParams.get('session_token');

  if (!conversationId || !sessionToken) {
    return NextResponse.json(
      { error: 'conversation_id and session_token required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const supabase = createServiceClient();

  // Verify session
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, external_id')
    .eq('id', conversationId)
    .eq('external_id', sessionToken)
    .eq('channel', 'live_chat')
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ messages: data ?? [] }, { headers: CORS_HEADERS });
}
