import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeSubject, generateSnippet, findClientByEmail } from '@/lib/email/utils';

/**
 * POST /api/webhooks/email/inbound
 * Receives inbound emails from SendGrid Inbound Parse (multipart/form-data).
 * Matches the sender to a client and the recipient to a staff member,
 * then stores the email and any attachments in the database.
 *
 * Always returns 200 to prevent SendGrid retries on processing errors.
 */
export async function POST(request: Request) {
  try {
    // 1. Basic auth — verify shared secret if configured
    const webhookSecret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('X-Webhook-Secret') || '';
      if (authHeader !== webhookSecret) {
        console.warn('Inbound email webhook: invalid secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Parse the multipart form data from SendGrid
    const formData = await request.formData();

    const fromRaw = formData.get('from') as string | null;
    const toRaw = formData.get('to') as string | null;
    const subject = (formData.get('subject') as string | null) || '(No Subject)';
    const bodyText = formData.get('text') as string | null;
    const bodyHtml = formData.get('html') as string | null;
    const headersRaw = formData.get('headers') as string | null;
    const envelopeRaw = formData.get('envelope') as string | null;

    if (!fromRaw || !toRaw) {
      console.warn('Inbound email webhook: missing from/to fields');
      return NextResponse.json({ ok: true, message: 'Missing required fields' });
    }

    // 3. Parse email addresses
    const fromAddress = extractEmailAddress(fromRaw);
    const fromName = extractDisplayName(fromRaw);
    const toAddress = extractEmailAddress(toRaw);

    // Parse envelope for additional data
    let envelope: { from?: string; to?: string[] } = {};
    if (envelopeRaw) {
      try {
        envelope = JSON.parse(envelopeRaw);
      } catch {
        // Non-critical — continue without envelope data
      }
    }

    // Parse raw headers into a record
    let rawHeaders: Record<string, string> = {};
    if (headersRaw) {
      rawHeaders = parseEmailHeaders(headersRaw);
    }

    const messageId = rawHeaders['message-id'] || rawHeaders['Message-ID'] || null;
    const inReplyTo = rawHeaders['in-reply-to'] || rawHeaders['In-Reply-To'] || null;
    const referencesHeader = rawHeaders['references'] || rawHeaders['References'] || null;

    const supabase = createServiceClient();

    // 4. Identify the staff member from the "to" address
    //    e.g. "daniel@inbound.isratransfer.com" -> look up "daniel" prefix
    const localPart = toAddress.split('@')[0]?.toLowerCase();

    const { data: staffUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .ilike('email', `${localPart}%`)
      .limit(1)
      .maybeSingle();

    if (!staffUser) {
      console.warn(`Inbound email: no staff user found for prefix "${localPart}"`);
      // Still return 200 so SendGrid doesn't retry
      return NextResponse.json({ ok: true, message: 'Staff user not found' });
    }

    // 5. Match the sender to a client by email address
    const clientId = await findClientByEmail(supabase, fromAddress);

    // 6. Generate a snippet from the body text
    const snippet = generateSnippet(bodyText);

    // 7. Find or create an email thread
    const normalizedSubject = normalizeSubject(subject);
    const threadId = await findOrCreateThread(supabase, {
      normalizedSubject,
      clientId,
      staffUserId: staffUser.id,
      subject: normalizedSubject,
    });

    // 8. Check for attachments
    const attachmentInfoRaw = formData.get('attachment-info') as string | null;
    let attachmentInfo: Record<string, { filename: string; type: string }> = {};
    if (attachmentInfoRaw) {
      try {
        attachmentInfo = JSON.parse(attachmentInfoRaw);
      } catch {
        // Non-critical — continue without attachment info
      }
    }
    const hasAttachments = Object.keys(attachmentInfo).length > 0;

    // 9. Insert the email record
    const { data: email, error: insertError } = await supabase
      .from('emails')
      .insert({
        thread_id: threadId,
        staff_user_id: staffUser.id,
        client_id: clientId,
        direction: 'inbound' as const,
        from_address: fromAddress,
        from_name: fromName,
        to_address: toAddress,
        to_name: null,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        snippet,
        message_id: messageId,
        in_reply_to: inReplyTo,
        references_header: referencesHeader,
        has_attachments: hasAttachments,
        is_read: false,
        is_starred: false,
        raw_headers: rawHeaders,
      })
      .select('id')
      .single();

    if (insertError || !email) {
      console.error('Failed to insert inbound email:', insertError);
      return NextResponse.json({ ok: true, message: 'Insert failed' });
    }

    // 10. Handle attachments — upload to Supabase Storage and record in DB
    if (hasAttachments) {
      for (const [key, info] of Object.entries(attachmentInfo)) {
        const file = formData.get(key) as File | null;
        if (!file) continue;

        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const storagePath = `${email.id}/${info.filename}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('email-attachments')
            .upload(storagePath, buffer, {
              contentType: info.type || file.type || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Failed to upload attachment "${info.filename}":`, uploadError);
            continue;
          }

          // Insert attachment record
          await supabase.from('email_attachments').insert({
            email_id: email.id,
            filename: info.filename,
            content_type: info.type || file.type || null,
            size_bytes: buffer.length,
            storage_path: storagePath,
          });
        } catch (err) {
          console.error(`Error processing attachment "${info.filename}":`, err);
        }
      }
    }

    return NextResponse.json({ ok: true, emailId: email.id });
  } catch (err) {
    console.error('Inbound email webhook unhandled error:', err);
    // Always return 200 to prevent SendGrid retries
    return NextResponse.json({ ok: true, message: 'Internal error' });
  }
}

// --- Helper functions ---

/**
 * Extract a bare email address from a string like "Daniel <daniel@example.com>"
 */
function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  // Might already be a bare address
  return raw.trim().toLowerCase();
}

/**
 * Extract the display name from a string like "Daniel Engelsman <daniel@example.com>"
 */
function extractDisplayName(raw: string): string | null {
  const match = raw.match(/^(.+?)\s*<[^>]+>/);
  if (match) return match[1].replace(/^["']|["']$/g, '').trim() || null;
  return null;
}

/**
 * Parse raw email headers string into a key-value record
 */
function parseEmailHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  // Headers are split by newlines; continuation lines start with whitespace
  const lines = raw.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    if (/^\s/.test(line)) {
      // Continuation of previous header
      currentValue += ' ' + line.trim();
    } else {
      // Save previous header
      if (currentKey) {
        headers[currentKey] = currentValue;
      }
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        currentKey = line.substring(0, colonIndex).trim();
        currentValue = line.substring(colonIndex + 1).trim();
      }
    }
  }
  // Save last header
  if (currentKey) {
    headers[currentKey] = currentValue;
  }

  return headers;
}

/**
 * Find an existing thread or create a new one.
 * Matches by normalized subject + client_id + staff_user_id.
 */
async function findOrCreateThread(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    normalizedSubject: string;
    clientId: string | null;
    staffUserId: string;
    subject: string;
  }
): Promise<string> {
  const now = new Date().toISOString();

  // Build query to find existing thread
  let query = supabase
    .from('email_threads')
    .select('id, message_count')
    .eq('staff_user_id', params.staffUserId)
    .ilike('subject', params.normalizedSubject);

  if (params.clientId) {
    query = query.eq('client_id', params.clientId);
  } else {
    query = query.is('client_id', null);
  }

  const { data: existingThread } = await query.limit(1).maybeSingle();

  if (existingThread) {
    // Update the existing thread
    await supabase
      .from('email_threads')
      .update({
        last_message_at: now,
        message_count: existingThread.message_count + 1,
      })
      .eq('id', existingThread.id);

    return existingThread.id;
  }

  // Create a new thread
  const { data: newThread, error: threadError } = await supabase
    .from('email_threads')
    .insert({
      subject: params.subject,
      client_id: params.clientId,
      staff_user_id: params.staffUserId,
      last_message_at: now,
      message_count: 1,
      is_archived: false,
    })
    .select('id')
    .single();

  if (threadError || !newThread) {
    console.error('Failed to create email thread:', threadError);
    throw new Error('Failed to create email thread');
  }

  return newThread.id;
}
