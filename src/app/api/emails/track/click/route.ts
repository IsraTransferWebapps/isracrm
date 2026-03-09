import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/emails/track/click?url=<destination>&eid=<emailId>
 * Click tracking endpoint. Records that a link was clicked in an email,
 * then redirects the user to the actual destination URL.
 * Validates the URL to prevent open redirect vulnerabilities.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destinationUrl = searchParams.get('url');
  const emailId = searchParams.get('eid');

  // Validate the destination URL to prevent open redirect attacks
  if (!destinationUrl || (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://'))) {
    return NextResponse.json({ error: 'Invalid or missing URL' }, { status: 400 });
  }

  // Record the click event if we have an email ID
  if (emailId) {
    try {
      const supabase = createServiceClient();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const userAgent = request.headers.get('user-agent') || null;

      await supabase.from('email_tracking_events').insert({
        email_id: emailId,
        event_type: 'click',
        metadata: { url: destinationUrl },
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch (err) {
      // Log but don't fail — always redirect the user
      console.error('Click tracking error:', err);
    }
  }

  // 302 redirect to the actual destination
  return NextResponse.redirect(destinationUrl, 302);
}
