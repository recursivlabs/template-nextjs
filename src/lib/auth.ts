'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Recursiv } from '@recursiv/sdk';
import { createAuthedSdk, getSessionKey, SESSION_COOKIE } from './recursiv';

const ORG_ID = process.env.RECURSIV_ORG_ID;
const BASE_URL = process.env.RECURSIV_API_BASE_URL || 'https://api.recursiv.io/api/v1';
const BASE_ORIGIN = BASE_URL.replace(/\/api\/v1$/, '');

// Scopes the per-user API key gets at sign-up / sign-in.
//
// SECURITY NOTE on `databases:*` and `storage:*`:
// These are project-level scopes. With them on a user's key, the user could
// (in principle) bypass the server's per-user scoping (the `WHERE user_id`
// guard in lib/db.ts, the `users/${user_id}/...` prefix in lib/storage.ts)
// by extracting their key from devtools and running raw SQL or listing all
// objects directly against the API.
//
// For a SHARED-DATA app (Twitter-style social) this is fine — members are
// expected to see each other's content. For a PRIVATE-DATA app (CRM, internal
// tool) this is a leak.
//
// The proper fix: server actions hold a separate `RECURSIV_PROJECT_KEY` env
// var (a project-bounded admin key, auto-injected by `provision_app` once
// that platform feature lands) and use it for DB/storage ops. The user's
// key gets ONLY identity + social scopes.
//
// Until then we keep the broader scopes so the template's /notes and /upload
// pages work end-to-end. Audit and tighten before shipping a CRM or any app
// with private user data.
const USER_KEY_SCOPES = [
  'users:read',
  'posts:read', 'posts:write',
  'communities:read', 'communities:write',
  'chat:read', 'chat:write',
  'agents:read', 'agents:write',
  'tags:read', 'tags:write',
  'commands:read', 'commands:write',
  'organizations:read',
  'memory:read', 'memory:write',
  // ⚠️  Tighten when shared-org has private user data — see note above.
  'databases:read', 'databases:write',
  'storage:read', 'storage:write',
];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

// TODO: once @recursiv/sdk@0.3.5 lands on npm (Origin header fix), replace
// the fetch-based flow below with a single call:
//   const r = new Recursiv({ allowNoKey: true });
//   const result = await r.auth.signUpAndCreateKey(input, { scopes, organizationId });
// Until then we hit the endpoints directly with explicit Origin headers.

async function authedFetch(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${BASE_ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function createUserApiKey(sessionToken: string): Promise<string> {
  const res = await authedFetch(
    '/api/v1/api-keys',
    {
      name: `app-session-${Date.now()}`,
      scopes: USER_KEY_SCOPES,
      organizationId: ORG_ID,
    },
    {
      Authorization: `Bearer ${sessionToken}`,
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create per-user API key (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const apiKey = json.data?.key || json.key;
  if (!apiKey) throw new Error('API key endpoint returned no key.');
  return apiKey;
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<SessionUser> {
  if (!ORG_ID) throw new Error('RECURSIV_ORG_ID env var is not set.');

  const res = await authedFetch('/api/auth/sign-up/email', input);
  if (!res.ok) {
    const text = await res.text();
    let msg = `Sign up failed (${res.status})`;
    try { const j = JSON.parse(text); msg = j.message || j.error?.message || msg; } catch { /* keep raw */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const token = data.token || data.session?.token;
  if (!token) throw new Error('Sign up response missing token.');

  // Recursiv's POST /api-keys auto-adds the new user as an org member when
  // the org has `allow_public_signup=true` (set automatically by
  // `provision_app` for customer apps). No client-side admin step needed.
  const apiKey = await createUserApiKey(token);
  setSessionCookie(apiKey);
  return {
    id: data.user?.id ?? '',
    name: data.user?.name ?? input.name,
    email: data.user?.email ?? input.email,
    image: data.user?.image ?? null,
  };
}

export async function signIn(input: { email: string; password: string }): Promise<SessionUser> {
  if (!ORG_ID) throw new Error('RECURSIV_ORG_ID env var is not set.');

  const res = await authedFetch('/api/auth/sign-in/email', input);
  if (!res.ok) {
    const text = await res.text();
    let msg = `Sign in failed (${res.status})`;
    try { const j = JSON.parse(text); msg = j.message || j.error?.message || msg; } catch { /* keep raw */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const token = data.token || data.session?.token;
  if (!token) throw new Error('Sign in response missing token.');

  const apiKey = await createUserApiKey(token);
  setSessionCookie(apiKey);
  return {
    id: data.user?.id ?? '',
    name: data.user?.name ?? '',
    email: data.user?.email ?? input.email,
    image: data.user?.image ?? null,
  };
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect('/sign-in');
}

export async function getSession(): Promise<SessionUser | null> {
  const apiKey = await getSessionKey();
  if (!apiKey) return null;
  try {
    const sdk: Recursiv = await createAuthedSdk(apiKey);
    const { data } = await sdk.users.me();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      email: (data as { email?: string }).email ?? '',
      image: data.image ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/sign-in');
  return user;
}
