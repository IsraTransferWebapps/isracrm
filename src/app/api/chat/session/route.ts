import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateConversation, matchVisitorToClient } from '@/lib/messaging/utils';
import { createServiceClient } from '@/lib/supabase/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CHAT_WIDGET_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/chat/session
 * Create or resume a live chat session for the website widget.
 */
export async function POST(request: NextRequest) {
  let body: { session_token?: string; visitor_name?: string; visitor_email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const sessionToken = body.session_token || crypto.randomUUID();

  const conversation = await findOrCreateConversation({
    channel: 'live_chat',
    externalId: sessionToken,
    visitorName: body.visitor_name,
    visitorEmail: body.visitor_email,
  });

  // If visitor provided email, attempt client match
  if (body.visitor_email && !conversation.client_id) {
    const client = await matchVisitorToClient(body.visitor_email);
    if (client) {
      const supabase = createServiceClient();
      await supabase
        .from('conversations')
        .update({
          client_id: client.id,
          assigned_to: client.assigned_account_manager_id,
        })
        .eq('id', conversation.id);
    }
  }

  return NextResponse.json(
    { session_token: sessionToken, conversation_id: conversation.id },
    { headers: CORS_HEADERS }
  );
}
