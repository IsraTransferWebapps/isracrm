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

  // Determine if this is the client portal
  // Production: portal.isratransfer.com | Local dev: /portal/* path prefix
  const isPortalHost = hostname.startsWith('portal.');
  const isPortalPath = pathname.startsWith('/portal');
  const isPortal = isPortalHost || isPortalPath;

  if (isPortal) {
    // --- CLIENT PORTAL ROUTING ---
    const portalPublicPaths = ['/portal/register', '/portal/login', '/auth/callback'];
    const isPublicPath = portalPublicPaths.some((p) => pathname.startsWith(p));

    // Check if the user is actually a client (not a staff user)
    const isClientUser = user?.user_metadata?.user_type === 'client';

    if (!user && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/portal/register';
      return NextResponse.redirect(url);
    }

    // Staff users on portal paths → send them to the CRM
    if (user && !isClientUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/clients';
      return NextResponse.redirect(url);
    }

    // Authenticated client users on login/register → send to portal hub
    // Skip redirect for server action requests (POST with Next-Action header)
    const isServerAction = request.method === 'POST' && request.headers.has('Next-Action');
    if (user && isClientUser && !isServerAction && (pathname === '/portal/login' || pathname === '/portal/register')) {
      const url = request.nextUrl.clone();
      url.pathname = '/portal';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // --- CRM ROUTING ---
  const publicPaths = ['/login', '/auth/callback'];
  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Webhook endpoints use their own signature-based auth — exempt from session check
  const isWebhookPath = pathname.startsWith('/api/webhooks/');
  if (isWebhookPath) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Block client users from CRM — redirect to client portal
  const isClientUser = user?.user_metadata?.user_type === 'client';
  if (user && isClientUser) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated staff users away from login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/clients';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
