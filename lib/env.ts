// Centralized, validated environment access. Public values are exposed to the
// browser via NEXT_PUBLIC_*; secrets (service role, RevenueCat) are server-only
// and must never be referenced from a client component.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  // Public — safe in the browser
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#',

  // Server-only — never import these into a client component
  serviceRoleKey: () =>
    required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  adminEmails: () =>
    (process.env.ADMIN_EMAILS ?? 'scosmor@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  revenueCatApiKey: () => process.env.REVENUECAT_API_KEY ?? '',
  revenueCatProjectId: () => process.env.REVENUECAT_PROJECT_ID ?? '',
  // v1 "Secret API Key" — required for granting/revoking promotional
  // entitlements (the v2 key above does NOT work for the v1 subscriber API).
  // Falls back to REVENUECAT_API_KEY in case the same secret is reused.
  revenueCatSecretKey: () =>
    process.env.REVENUECAT_SECRET_KEY ?? process.env.REVENUECAT_API_KEY ?? '',
  // Shared secret RevenueCat sends in the webhook Authorization header.
  revenueCatWebhookSecret: () => process.env.REVENUECAT_WEBHOOK_SECRET ?? '',
};
