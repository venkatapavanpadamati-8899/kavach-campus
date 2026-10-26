import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Never use this client in the browser or public API routes.
// It bypasses Row Level Security (RLS) policies completely.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
