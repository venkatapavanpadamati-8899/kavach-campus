# KAVACH CAMPUS — GOOGLE OAUTH 2.0 PKCE REPAIR REPORT

**Workspace:** `D:\kavach-campus`  
**Date:** 2026-11-05  
**Severity:** High (Authentication Blocker)  
**Status:** **REPAIRED & VERIFIED IN SOURCE CODE** (Owner external dashboard configuration required for live Google credentials)  

---

## 1. Problem Description

When initiating Google OAuth authentication from certain devices or network origins, users encountered the error:
```
AuthApiError: PKCE code verifier not found in storage
```
This error prevented users from completing the Google Sign-In handshake and accessing student or administrative dashboards.

---

## 2. Root Cause Analysis

Thorough architectural investigation identified four converging factors contributing to this failure:

### 2.1 Origin and Host Domain Mismatch (Local vs LAN IP)
* When accessing the application from mobile or tablet devices over the local network (e.g., `http://192.168.1.7:3000`), the browser initiates the OAuth flow on that LAN origin.
* If the callback URL configured in Supabase or the code verifier cookie was scoped strictly to `localhost:3000`, the browser's cookie jar for `192.168.1.7` could not read `localhost` cookies.
* When Google returned the authorization code to the callback endpoint, the server could not find the corresponding `sb-<project-ref>-auth-token-code-verifier` cookie in the request header.

### 2.2 Next.js App Router Redirect Cookie Dropping
* In Next.js App Router (Next 15/16), when a Route Handler performs `NextResponse.redirect(url)` without attaching cookies set during `createServerClient`, the outgoing HTTP 307 response drops the `Set-Cookie` headers containing the PKCE code verifier.
* Without the code verifier cookie persisted in the user's browser, the subsequent `/api/auth/callback` request arrives without any cryptographic verifier.

### 2.3 Browser Client Instance Multiplication (Client-Side Race Conditions)
* In React 19 client components, if `createBrowserClient` is called multiple times across re-renders without being stored as a singleton, multiple GoTrue client instances simultaneously read and write to document cookies.
* This caused race conditions where the storage key for the PKCE code verifier was overwritten or flushed before the OAuth redirect occurred.

### 2.4 Missing Cookie Path and SameSite Configuration
* Default cookie options without explicit `path: '/'` and `sameSite: 'lax'` caused some mobile browsers (especially Safari iOS and Chrome Android) to treat the verifier cookie as session-scoped to the `/api` path rather than the entire origin, preventing it from being transmitted during the callback step.

---

## 3. Engineering Fixes Implemented

### 3.1 Browser Client Singleton (`src/lib/supabase/client.ts`)
We refactored `createClient()` to enforce a persistent browser singleton:
```typescript
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      isSingleton: true,
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
      },
    });
  }
  return browserClientInstance;
}
```
* Benefits: Guarantees a single storage manager in memory, eliminates storage race conditions, and standardizes `path: '/'` and `SameSite: Lax` on all client-stored cookies.

### 3.2 Dynamic Origin Resolution (`src/app/api/auth/google/route.ts` & `src/app/api/auth/callback/route.ts`)
Both route handlers now resolve the true request origin dynamically:
```typescript
const forwardedHost = request.headers.get('x-forwarded-host');
const forwardedProto = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '');
const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin;
```
* When running locally, requests from `192.168.1.7:3000` resolve `origin` to `http://192.168.1.7:3000`.
* When behind a reverse proxy or deployed on Vercel, requests resolve correctly to `https://kavach-campus.vercel.app`.

### 3.3 Server Client Cookie Synchronization (`src/lib/supabase/server.ts`)
The server client factory now explicitly defines cookie attributes:
```typescript
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
    },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax',
            });
          });
        } catch {}
      },
    },
  });
}
```

### 3.4 Proxy Middleware Cookie Preservation (`src/proxy.ts`)
In `src/proxy.ts`, the helper `redirectWithCookies()` ensures that any session or verifier cookies attached to the Supabase response are explicitly copied to the redirect response:
```typescript
function redirectWithCookies(targetUrl: URL, supabaseResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(targetUrl);
  supabaseResponse.cookies.getAll().forEach((c) => {
    redirectResponse.cookies.set(c.name, c.value, {
      ...c,
      path: c.path || '/',
      sameSite: (c.sameSite as any) || 'lax',
    });
  });
  return redirectResponse;
}
```

---

## 4. Owner Configuration Action Guide

To enable Google Sign-In with real Google accounts, the following configuration must be verified in the Google Cloud Console and Supabase Dashboard:

### 4.1 Google Cloud Console Configuration
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID for Kavach Campus.
3. Under **Authorized JavaScript Origins**, add:
   * `http://localhost:3000`
   * `http://127.0.0.1:3000`
   * `http://192.168.1.7:3000` (for local mobile testing)
   * `https://kavach-campus.vercel.app` (for production)
4. Under **Authorized Redirect URIs**, add:
   * `https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback` (Supabase Project Auth Callback)
   * `http://localhost:3000/api/auth/callback`
   * `http://192.168.1.7:3000/api/auth/callback`
   * `https://kavach-campus.vercel.app/api/auth/callback`
5. Save changes.

### 4.2 Supabase Dashboard Configuration
1. Go to Supabase Project Dashboard -> **Authentication** -> **URL Configuration**.
2. **Site URL:** Set to `http://localhost:3000` (or `https://kavach-campus.vercel.app` in production).
3. **Redirect URLs (Whitelist):** Add the following entries:
   * `http://localhost:3000/**`
   * `http://127.0.0.1:3000/**`
   * `http://192.168.1.7:3000/**`
   * `https://kavach-campus.vercel.app/**`
4. Under **Authentication** -> **Providers** -> **Google**:
   * Ensure **Google Enabled** is toggled ON.
   * Paste the **Client ID** and **Client Secret** obtained from Google Cloud Console.
   * Save changes.

