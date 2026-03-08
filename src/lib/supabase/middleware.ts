import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is critical for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Determine if this is the onboarding portal
  // Production: onboard.isratransfer.com | Local dev: /onboard/* path prefix
  const isOnboardingHost = hostname.startsWith('onboard.');
  const isOnboardingPath = pathname.startsWith('/onboard');
  const isOnboarding = isOnboardingHost || isOnboardingPath;

  if (isOnboarding) {
    // --- ONBOARDING PORTAL ROUTING ---
    const onboardingPublicPaths = ['/onboard/register', '/onboard/login', '/auth/callback'];
    const isPublicPath = onboardingPublicPaths.some((p) => pathname.startsWith(p));

    if (!user && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboard/register';
      return NextResponse.redirect(url);
    }

    if (user && (pathname === '/onboard/login' || pathname === '/onboard/register')) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboard';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // --- CRM ROUTING (existing logic) ---
  const publicPaths = ['/login', '/auth/callback'];
  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Redirect unauthenticated users to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/clients';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
