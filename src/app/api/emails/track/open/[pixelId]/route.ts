import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * GET /api/emails/track/open/[pixelId]
 * Tracking pixel endpoint. When an email client loads this image,
 * it records an "open" event for the associated email.
 * Returns a 1x1 transparent GIF with no-cache headers.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ pixelId: string }> }
) {
  const { pixelId } = await params;

  // Process the tracking event in the background — don't delay the GIF response
  try {
    const supabase = createServiceClient();

    // Look up the email by its tracking pixel ID
    const { data: email } = await supabase
      .from('emails')
      .select('id, opened_at')
      .eq('tracking_pixel_id', pixelId)
      .single();

    if (email) {
      // Only set opened_at on the first open
      if (!email.opened_at) {
        await supabase
          .from('emails')
          .update({ opened_at: new Date().toISOString() })
          .eq('id', email.id);
      }

      // Record the tracking event (every open, not just the first)
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const userAgent = request.headers.get('user-agent') || null;

      await supabase.from('email_tracking_events').insert({
        email_id: email.id,
        event_type: 'open',
        ip_address: ip,
        user_agent: userAgent,
      });
    }
  } catch (err) {
    // Log but don't fail — always return the GIF
    console.error('Open tracking error:', err);
  }

  // Return the transparent GIF with aggressive no-cache headers
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
