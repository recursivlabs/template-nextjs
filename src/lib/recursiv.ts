'use server';

import { Recursiv } from '@recursiv/sdk';
import { cookies } from 'next/headers';

// ── Per-user API key pattern ────────────────────────────────────────
// 1. Sign-up / sign-in uses an "anonymous" SDK (no API key) to call
//    auth.signUpAndCreateKey / signInAndCreateKey. That call returns a
//    per-user API key scoped to the org.
// 2. The per-user key is stored in an HTTP-only cookie.
// 3. Every subsequent SDK call reads the cookie, builds an SDK instance
//    bound to that user's key, and acts as that user. Recursiv enforces
//    scope and ownership — your code does not write tenancy logic.
//
// Result: the deployed app does NOT need RECURSIV_API_KEY. There is no
// god platform key on the server. Each request is the user.

export const SESSION_COOKIE = 'recursiv_session';

/** SDK with no API key — for unauthenticated calls (signUp/signIn). */
export async function anonSdk(): Promise<Recursiv> {
  return new Recursiv({
    allowNoKey: true,
    ...(process.env.RECURSIV_API_BASE_URL && { baseUrl: process.env.RECURSIV_API_BASE_URL }),
  });
}

/** Build an SDK instance bound to a specific user's API key. */
export async function createAuthedSdk(apiKey: string): Promise<Recursiv> {
  return new Recursiv({
    apiKey,
    ...(process.env.RECURSIV_API_BASE_URL && { baseUrl: process.env.RECURSIV_API_BASE_URL }),
  });
}

/** Read the user's API key from the session cookie. Returns null if not signed in. */
export async function getSessionKey(): Promise<string | null> {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

/** Get an SDK instance acting as the current user. Throws if not signed in. */
export async function getAuthedSdk(): Promise<Recursiv> {
  const apiKey = await getSessionKey();
  if (!apiKey) throw new Error('Not signed in. Call from a route that requires auth.');
  return createAuthedSdk(apiKey);
}

/** Get an SDK instance acting as the current user, or null if not signed in. */
export async function tryAuthedSdk(): Promise<Recursiv | null> {
  const apiKey = await getSessionKey();
  if (!apiKey) return null;
  return createAuthedSdk(apiKey);
}
