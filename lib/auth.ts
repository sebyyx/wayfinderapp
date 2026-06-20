import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export type AdminUser = { id: string; email: string };

// Returns the signed-in admin if (and only if) there is a valid Supabase session
// whose email is on the allowlist. Otherwise null. All admin pages gate on this.
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  const allowed = env.adminEmails();
  if (!allowed.includes(user.email.toLowerCase())) return null;

  return { id: user.id, email: user.email };
}
