import { createBrowserClient } from '@supabase/ssr';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLISHABLE_KEY || '';
  return Boolean(
    url &&
    !url.includes('placeholder') &&
    url.startsWith('https://') &&
    anonKey &&
    !anonKey.includes('placeholder') &&
    anonKey.length > 20
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLISHABLE_KEY || '';
  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder-anon-key'
  );
}
