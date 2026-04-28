'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Recursiv } from '@recursiv/sdk';
import { createAuthedSdk, getSessionKey, SESSION_COOKIE } from './recursiv';

const ORG_ID = process.env.RECURSIV_ORG_ID;
const ADMIN_API_KEY = process.env.RECURSIV_ADMIN_API_KEY;
const BASE_URL = process.env.RECURSIV_API_BASE_URL || 'https://api.recursiv.io/api/v1';
const BASE_ORIGIN = BASE_URL.replace(/\/api\/v1$/, '');

// Scopes the per-user API key gets when a user signs up / in.
// Match this to the resources your app actually uses. Add scopes as you add features.
const USER_KEY_SCOPES = [
  'users:read',
  'posts:read', 'posts:write',
  'communities:read', 'communities:write',
  'chat:read', 'chat:write',
  'agents:read', 'agents:write',
  'tags:read', 'tags:write',
  'commands:read', 'commands:write',
  'storage:read', 'storage:write',
  'organizations:read', 'organizations:write',
  'databases:read', 'databases:write',
  'memory:read', 'memory:write',
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

async function authedFetch(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return res;
}

/**
 * After Better Auth creates the user, add them to the app's shared org using
 * the admin API key. This is the ONLY server-side use of the admin key — every
 * other SDK call uses the user's per-user key. Without this step, the per-user
 * api-key creation 403s with `not_org_member`.
 */
async function addNewUserToOrg(userId: string): Promise<void> {
  if (!ADMIN_API_KEY) {
    throw new Error(
      'RECURSIV_ADMIN_API_KEY env var is not set. The signup flow needs an admin key ' +
      'to add new users to the app org. Get one from your Recursiv org settings.',
    );
  }
  if (!ORG_ID) throw new Error('RECURSIV_ORG_ID env var is not set.');
  const admin = new Recursiv({ apiKey: ADMIN_API_KEY });
  await admin.organizations.addMember(ORG_ID, { user_id: userId, role: 'member' });
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
  const userId = data.user?.id;
  if (!token || !userId) throw new Error('Sign up response missing token or user id.');

  // Add the new user to the app's shared org so their per-user key can be org-scoped.
  await addNewUserToOrg(userId);

  const apiKey = await createUserApiKey(token);
  setSessionCookie(apiKey);
  return {
    id: userId,
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

  // Existing users are already org members, so no add-member step needed on sign-in.
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
