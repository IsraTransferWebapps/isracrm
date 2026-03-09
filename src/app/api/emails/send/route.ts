import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normalizeSubject, generateSnippet, escapeHtml, findClientByEmail } from '@/lib/email/utils';

// Server-side attachment size limit (25 MB)
const MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024;

/**
 * POST /api/emails/send
 * Sends an email via Resend on behalf of the authenticated staff user.
 * Accepts FormData to support file attachments and CC addresses.
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

    // 2. Parse FormData (supports attachments)
    const formData = await request.formData();

    const to = formData.get('to') as string | null;
    const subject = formData.get('subject') as string | null;
    const bodyRaw = formData.get('body') as string | null;
    const ccRaw = formData.get('cc') as string | null;
    const threadId = formData.get('threadId') as string | null;
    const clientId = formData.get('clientId') as string | null;
    const inReplyTo = formData.get('inReplyTo') as string | null;

    // Get all attachment files
    const attachmentFiles = formData.getAll('attachments') as File[];

    if (!to || !subject || !bodyRaw) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Parse CC addresses (comma-separated)
    const ccAddresses: string[] = ccRaw
      ? ccRaw.split(',').map((e) => e.trim()).filter(Boolean)
      : [];

    // Convert plain text body to simple HTML for sending
    const bodyText = bodyRaw;
    const bodyHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">${escapeHtml(bodyRaw).replace(/\n/g, '<br />')}</div>`;

    // 3. Validate environment config
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_ADDRESS;
    const appUrl = process.env.APP_URL || process.env.URL || 'https://isracrm.netlify.app';
    if (!resendApiKey || !fromAddress) {
      console.error('RESEND_API_KEY or RESEND_FROM_ADDRESS not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // 4. Read all attachment buffers once upfront (avoids double stream reads)
    const attachmentBuffers: { filename: string; content: Buffer; type: string; size: number }[] = [];
    let totalSize = 0;

    for (const file of attachmentFiles) {
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
        return NextResponse.json(
          { error: `Total attachment size exceeds 25 MB limit` },
          { status: 400 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      attachmentBuffers.push({
        filename: file.name,
        content: Buffer.from(arrayBuffer),
        type: file.type || 'application/octet-stream',
        size: file.size,
      });
    }

    // 5. Generate tracking pixel ID and inject into HTML
    const trackingPixelId = randomUUID();
    const trackingPixelUrl = `${appUrl}/api/emails/track/open/${trackingPixelId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    // Insert tracking pixel before </body> if present, otherwise append to end
    let htmlWithTracking: string;
    if (bodyHtml.includes('</body>')) {
      htmlWithTracking = bodyHtml.replace('</body>', `${trackingPixel}</body>`);
    } else {
      htmlWithTracking = bodyHtml + trackingPixel;
    }

    // 6. Send via Resend
    const resend = new Resend(resendApiKey);

    const sendPayload: Parameters<typeof resend.emails.send>[0] = {
      from: fromAddress,
      to: [to],
      subject,
      html: htmlWithTracking,
      text: bodyText || undefined,
      headers: inReplyTo ? { 'In-Reply-To': inReplyTo } : undefined,
    };

    // Add CC if provided
    if (ccAddresses.length > 0) {
      sendPayload.cc = ccAddresses;
    }

    // Add attachments if provided (reuse cached buffers)
    if (attachmentBuffers.length > 0) {
      sendPayload.attachments = attachmentBuffers.map((a) => ({
        filename: a.filename,
        content: a.content,
      }));
    }

    const sendResult = await resend.emails.send(sendPayload);

    if (sendResult.error) {
      console.error('Resend send error:', sendResult.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: sendResult.error.message },
        { status: 502 }
      );
    }

    const resendMessageId = sendResult.data?.id || null;
    const serviceClient = createServiceClient();

    // 7. Resolve the client ID if not provided
    let resolvedClientId = clientId || null;
    if (!resolvedClientId) {
      resolvedClientId = await findClientByEmail(serviceClient, to.toLowerCase());
    }

    // 8. Resolve or create the thread
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

    // 9. Generate snippet from plain text
    const snippet = generateSnippet(bodyText);

    // 10. Insert the email record
    const { data: email, error: insertError } = await serviceClient
      .from('emails')
      .insert({
        thread_id: resolvedThreadId,
        staff_user_id: user.id,
        client_id: resolvedClientId,
        direction: 'outbound',
        from_address: fromAddress,
        from_name: null,
        to_address: to,
        to_name: null,
        cc: ccAddresses.length > 0 ? ccAddresses : null,
        subject,
        body_text: bodyText || null,
        body_html: htmlWithTracking,
        snippet,
        message_id: resendMessageId,
        in_reply_to: inReplyTo || null,
        has_attachments: attachmentBuffers.length > 0,
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

    // 11. Upload attachments to Supabase Storage and insert records (parallel)
    if (attachmentBuffers.length > 0) {
      await Promise.all(
        attachmentBuffers.map(async (att) => {
          const storagePath = `emails/${email.id}/${randomUUID()}-${att.filename}`;

          const { error: uploadError } = await serviceClient.storage
            .from('email-attachments')
            .upload(storagePath, att.content, {
              contentType: att.type,
            });

          if (uploadError) {
            console.error(`Failed to upload attachment ${att.filename}:`, uploadError);
            return; // Don't fail the whole request for a single attachment
          }

          // Insert attachment record in the database
          const { error: attachInsertError } = await serviceClient
            .from('email_attachments')
            .insert({
              email_id: email.id,
              filename: att.filename,
              content_type: att.type,
              size_bytes: att.size,
              storage_path: storagePath,
            });

          if (attachInsertError) {
            console.error(`Failed to insert attachment record for ${att.filename}:`, attachInsertError);
          }
        })
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
