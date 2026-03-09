import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/emails/send
 * Sends an email via Resend on behalf of the authenticated staff user.
 * Inserts the email into the database and manages thread associations.
 * Includes a tracking pixel for open tracking.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse the request body
    const body = await request.json();
    const {
      to,
      subject,
      bodyHtml,
      bodyText,
      threadId,
      clientId,
      inReplyTo,
    } = body as {
      to: string;
      subject: string;
      bodyHtml: string;
      bodyText: string;
      threadId?: string;
      clientId?: string;
      inReplyTo?: string;
    };

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, bodyHtml' },
        { status: 400 }
      );
    }

    // 3. Validate environment config
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_ADDRESS;
    if (!resendApiKey || !fromAddress) {
      console.error('RESEND_API_KEY or RESEND_FROM_ADDRESS not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // 4. Generate tracking pixel ID and inject into HTML
    const trackingPixelId = randomUUID();
    const trackingPixelUrl = `https://isracrm.netlify.app/api/emails/track/open/${trackingPixelId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    // Insert tracking pixel before </body> if present, otherwise append to end
    let htmlWithTracking: string;
    if (bodyHtml.includes('</body>')) {
      htmlWithTracking = bodyHtml.replace('</body>', `${trackingPixel}</body>`);
    } else {
      htmlWithTracking = bodyHtml + trackingPixel;
    }

    // 5. Send via Resend
    const resend = new Resend(resendApiKey);

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html: htmlWithTracking,
      text: bodyText || undefined,
      headers: inReplyTo ? { 'In-Reply-To': inReplyTo } : undefined,
    });

    if (sendResult.error) {
      console.error('Resend send error:', sendResult.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: sendResult.error.message },
        { status: 502 }
      );
    }

    const resendMessageId = sendResult.data?.id || null;
    const serviceClient = createServiceClient();

    // 6. Resolve the client ID if not provided
    let resolvedClientId = clientId || null;
    if (!resolvedClientId) {
      resolvedClientId = await findClientByEmail(serviceClient, to.toLowerCase());
    }

    // 7. Resolve or create the thread
    let resolvedThreadId = threadId || null;

    if (resolvedThreadId) {
      // Update existing thread
      const { data: existingThread } = await serviceClient
        .from('email_threads')
        .select('id, message_count')
        .eq('id', resolvedThreadId)
        .single();

      if (existingThread) {
        await serviceClient
          .from('email_threads')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: existingThread.message_count + 1,
          })
          .eq('id', existingThread.id);
      }
    } else if (resolvedClientId) {
      // Create a new thread since we have a client but no thread
      const { data: newThread, error: threadError } = await serviceClient
        .from('email_threads')
        .insert({
          subject: normalizeSubject(subject),
          client_id: resolvedClientId,
          staff_user_id: user.id,
          last_message_at: new Date().toISOString(),
          message_count: 1,
          is_archived: false,
        })
        .select('id')
        .single();

      if (threadError) {
        console.error('Failed to create email thread:', threadError);
      } else {
        resolvedThreadId = newThread?.id || null;
      }
    }

    // 8. Generate snippet from plain text
    const snippet = bodyText
      ? bodyText.replace(/\s+/g, ' ').trim().substring(0, 120)
      : null;

    // 9. Insert the email record
    const { data: email, error: insertError } = await serviceClient
      .from('emails')
      .insert({
        thread_id: resolvedThreadId,
        staff_user_id: user.id,
        client_id: resolvedClientId,
        direction: 'outbound' as const,
        from_address: fromAddress,
        from_name: null,
        to_address: to,
        to_name: null,
        subject,
        body_text: bodyText || null,
        body_html: htmlWithTracking,
        snippet,
        message_id: resendMessageId,
        in_reply_to: inReplyTo || null,
        has_attachments: false,
        is_read: true, // Outbound emails are already "read"
        is_starred: false,
        tracking_pixel_id: trackingPixelId,
      })
      .select('id')
      .single();

    if (insertError || !email) {
      console.error('Failed to insert outbound email:', insertError);
      return NextResponse.json(
        { error: 'Email sent but failed to save record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      emailId: email.id,
      threadId: resolvedThreadId,
      resendId: resendMessageId,
    });
  } catch (err) {
    console.error('Email send route unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- Helper functions ---

/**
 * Strip Re:/Fwd: prefixes from subject for thread matching
 */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd?|fw)\s*:\s*/gi, '')
    .replace(/^(re|fwd?|fw)\s*:\s*/gi, '')
    .trim();
}

/**
 * Find a client by their email address
 */
async function findClientByEmail(
  supabase: ReturnType<typeof createServiceClient>,
  email: string
): Promise<string | null> {
  const { data: individual } = await supabase
    .from('individual_details')
    .select('client_id')
    .ilike('email_primary', email)
    .limit(1)
    .maybeSingle();

  if (individual) return individual.client_id;

  const { data: individualSecondary } = await supabase
    .from('individual_details')
    .select('client_id')
    .ilike('email_secondary', email)
    .limit(1)
    .maybeSingle();

  if (individualSecondary) return individualSecondary.client_id;

  return null;
}
