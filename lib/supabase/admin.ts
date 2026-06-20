import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Service-role client: bypasses RLS to read aggregate analytics across all users.
// SERVER ONLY. The 'server-only' import makes the build fail if this is ever
// pulled into a client bundle.
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
