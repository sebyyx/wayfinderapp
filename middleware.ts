import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Two jobs:
// 1. Serve the admin subdomain (admin.wayfinderapp.life) from the /admin routes.
// 2. Keep the Supabase auth session fresh on every admin request so Server
//    Components see a valid session.
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const isAdminHost = host.startsWith('admin.');
  const url = request.nextUrl;

  // Map the admin subdomain onto the /admin path tree.
  if (isAdminHost && !url.pathname.startsWith('/admin')) {
    const rewritten = url.clone();
    rewritten.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`;
    return rewriteWithSession(request, rewritten);
  }

  // On the main domain, keep /admin reachable too (handy in dev) but still
  // refresh the session there.
  if (url.pathname.startsWith('/admin')) {
    return rewriteWithSession(request, null);
  }

  return NextResponse.next();
}

function rewriteWithSession(request: NextRequest, rewriteTo: URL | null) {
  const response = rewriteTo
    ? NextResponse.rewrite(rewriteTo)
    : NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the session so expired tokens get refreshed into the response cookies.
  void supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
