import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { EmailTrackingEventType } from '@/types/database';

/**
 * Mapping from Resend webhook event types to our tracking event types.
 * Only events we care about are mapped — others are acknowledged but ignored.
 */
const EVENT_TYPE_MAP: Record<string, EmailTrackingEventType> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounce',
  'email.opened': 'open',
  'email.clicked': 'click',
};

/**
 * POST /api/webhooks/email/resend
 * Receives webhook events from Resend for delivery tracking.
 * Maps events to our tracking_events table for the corresponding email.
 * Always returns 200 to acknowledge receipt.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse the webhook payload
    let payload: Record<string, unknown>;
    try {
      payload = await request.json();
    } catch {
      console.warn('Resend webhook: invalid JSON body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = payload.type as string;
    const eventData = payload.data as Record<string, unknown> | undefined;

    if (!eventType || !eventData) {
      console.warn('Resend webhook: missing type or data', payload);
      return NextResponse.json({ ok: true, message: 'Missing type or data' });
    }

    // 2. Map to our tracking event type — skip events we don't track
    const mappedEventType = EVENT_TYPE_MAP[eventType];
    if (!mappedEventType) {
      // Acknowledge events we don't handle (e.g. email.sent, email.complained)
      return NextResponse.json({ ok: true, message: `Event type ${eventType} ignored` });
    }

    // 3. Find the email by Resend message ID
    //    Resend sends the email ID as `email_id` in the data payload
    const resendEmailId = eventData.email_id as string | undefined;
    if (!resendEmailId) {
      console.warn('Resend webhook: missing email_id in event data');
      return NextResponse.json({ ok: true, message: 'Missing email_id' });
    }

    const supabase = createServiceClient();

    // Look up our email record by the Resend message ID (stored in message_id field)
    const { data: email } = await supabase
      .from('emails')
      .select('id')
      .eq('message_id', resendEmailId)
      .limit(1)
      .maybeSingle();

    if (!email) {
      // Not found — could be from a different environment or already deleted
      return NextResponse.json({ ok: true, message: 'Email not found' });
    }

    // 4. Insert the tracking event
    const { error: insertError } = await supabase
      .from('email_tracking_events')
      .insert({
        email_id: email.id,
        event_type: mappedEventType,
        metadata: {
          resend_event_type: eventType,
          ...(eventData.bounce as Record<string, unknown> || {}),
          ...(eventData.click as Record<string, unknown> || {}),
        },
      });

    if (insertError) {
      console.error('Failed to insert Resend tracking event:', insertError);
    }

    // 5. For bounce events, we could optionally mark the email or alert the user
    //    (kept simple for now — just the tracking event is recorded)

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Resend webhook unhandled error:', err);
    // Always return 200 to prevent retries
    return NextResponse.json({ ok: true, message: 'Internal error' });
  }
}
