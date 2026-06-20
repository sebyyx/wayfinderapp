import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

// Cookie-backed auth client used to read the admin's Supabase session in Server
// Components / Route Handlers. Uses the anon key — it only ever sees the signed-in
// user's own session, never other users' data.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only — safe to
          // ignore; the middleware refreshes the session.
        }
      },
    },
  });
}
