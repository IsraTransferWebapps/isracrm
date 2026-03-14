import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { findOrCreateConversation, insertMessage } from '@/lib/messaging/utils';

/**
 * POST /api/webhooks/twilio/whatsapp
 * Receives inbound WhatsApp messages from Twilio.
 * Twilio sends form-urlencoded data.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get('From') as string; // e.g. 'whatsapp:+972501234567'
  const body = formData.get('Body') as string;
  const messageSid = formData.get('MessageSid') as string;
  const profileName = formData.get('ProfileName') as string | null;
  const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);

  if (!from || !body) {
    // Always return 200 with TwiML to prevent Twilio retries
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // Extract phone number (remove 'whatsapp:' prefix)
  const phoneNumber = from.replace('whatsapp:', '');

  // Try to match phone number to an existing client
  const supabase = createServiceClient();
  const { data: client } = await supabase
    .from('clients')
    .select('id, assigned_account_manager_id')
    .or(
      `individual_details->>phone_primary.eq.${phoneNumber},individual_details->>phone_secondary.eq.${phoneNumber}`
    )
    .limit(1)
    .maybeSingle();

  // Find or create conversation
  const conversation = await findOrCreateConversation({
    clientId: client?.id ?? null,
    channel: 'whatsapp',
    assignedTo: client?.assigned_account_manager_id ?? null,
    externalId: from, // Store full 'whatsapp:+...' format for replies
    visitorName: profileName,
  });

  // Handle media attachments
  const attachments = [];
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`) as string;
    const mediaType = formData.get(`MediaContentType${i}`) as string;
    if (mediaUrl) {
      attachments.push({
        url: mediaUrl,
        filename: `attachment_${i}`,
        type: mediaType || 'application/octet-stream',
        size: 0,
      });
    }
  }

  // Insert message
  await insertMessage({
    conversationId: conversation.id,
    senderType: 'client',
    senderId: client?.id ?? null,
    body,
    channel: 'whatsapp',
    externalMessageId: messageSid,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  // Return empty TwiML (staff will reply from CRM, not auto-reply)
  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
