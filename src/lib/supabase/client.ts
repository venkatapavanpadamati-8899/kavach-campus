import { createBrowserClient } from '@supabase/ssr';

let cachedBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLISHABLE_KEY || '';
  const isUrlValid =
    url &&
    !url.includes('placeholder') &&
    (url.startsWith('https://') ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://192.168.'));
  return Boolean(
    isUrlValid &&
    anonKey &&
    !anonKey.includes('placeholder') &&
    anonKey.length > 20
  );
}

export function createClient() {
  if (typeof window !== 'undefined' && cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLISHABLE_KEY || '';

  const client = createBrowserClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder-anon-key',
    {
      isSingleton: true,
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
      },
    }
  );

  if (typeof window !== 'undefined') {
    cachedBrowserClient = client;
  }

  return client;
}
