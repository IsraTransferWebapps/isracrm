import { createServiceClient } from '@/lib/supabase/server';
import type { ConversationChannel } from '@/types/database';

/**
 * Find an existing open conversation for a client+channel, or create one.
 */
export async function findOrCreateConversation({
  clientId,
  channel,
  assignedTo,
  externalId,
  visitorName,
  visitorEmail,
}: {
  clientId?: string | null;
  channel: ConversationChannel;
  assignedTo?: string | null;
  externalId?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
}) {
  const supabase = createServiceClient();

  // Try to find existing open conversation for this client+channel
  if (clientId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .eq('channel', channel)
      .neq('status', 'closed')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return existing;
  }

  // For live_chat, check by external_id (session token)
  if (channel === 'live_chat' && externalId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('external_id', externalId)
      .eq('channel', 'live_chat')
      .neq('status', 'closed')
      .maybeSingle();

    if (existing) return existing;
  }

  // For WhatsApp, check by external_id (phone number)
  if (channel === 'whatsapp' && externalId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('external_id', externalId)
      .eq('channel', 'whatsapp')
      .neq('status', 'closed')
      .maybeSingle();

    if (existing) return existing;
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId ?? null,
      channel,
      status: 'waiting_on_staff' as const,
      assigned_to: assignedTo ?? null,
      external_id: externalId ?? null,
      visitor_name: visitorName ?? null,
      visitor_email: visitorEmail ?? null,
      unread_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data;
}

/**
 * Insert a message into a conversation and update conversation metadata.
 */
export async function insertMessage({
  conversationId,
  senderType,
  senderId,
  body,
  channel,
  externalMessageId,
  attachments,
}: {
  conversationId: string;
  senderType: 'client' | 'staff' | 'system' | 'bot';
  senderId?: string | null;
  body: string;
  channel: ConversationChannel;
  externalMessageId?: string | null;
  attachments?: { url: string; filename: string; type: string; size: number }[];
}) {
  const supabase = createServiceClient();

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId ?? null,
      body,
      channel,
      external_message_id: externalMessageId ?? null,
      attachments: attachments ?? [],
      is_read: senderType === 'staff',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert message: ${error.message}`);

  // Update conversation metadata
  const isClientMessage = senderType === 'client';
  await supabase
    .from('conversations')
    .update({
      last_message_at: message.created_at,
      status: isClientMessage ? 'waiting_on_staff' : 'waiting_on_client',
    })
    .eq('id', conversationId);

  // Increment unread count for client messages
  if (isClientMessage) {
    await supabase.rpc('increment_unread_count', { conv_id: conversationId });
  }

  return message;
}

/**
 * Try to match a visitor to an existing client by email address.
 * Returns client id and account manager id if found.
 */
export async function matchVisitorToClient(email: string) {
  const supabase = createServiceClient();
  const normalised = email.toLowerCase().trim();

  // Check individual_details for primary or secondary email
  const { data: individual } = await supabase
    .from('clients')
    .select('id, assigned_account_manager_id')
    .or(
      `individual_details->>email_primary.ilike.${normalised},individual_details->>email_secondary.ilike.${normalised}`
    )
    .limit(1)
    .maybeSingle();

  if (individual) return individual;

  // Check corporate_details for contact email
  const { data: corporate } = await supabase
    .from('clients')
    .select('id, assigned_account_manager_id')
    .ilike('corporate_details->>contact_email', normalised)
    .limit(1)
    .maybeSingle();

  return corporate ?? null;
}
