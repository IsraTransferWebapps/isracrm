import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the OAuth/magic link/password recovery callback from Supabase Auth
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/clients';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this is a password recovery flow, redirect to reset password page
      // Supabase sets the session type in the AMR (Authentication Methods Reference)
      const isRecovery = data.session?.user?.recovery_sent_at != null &&
        Date.now() - new Date(data.session.user.recovery_sent_at).getTime() < 600000; // within 10 min

      if (isRecovery) {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or error, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
