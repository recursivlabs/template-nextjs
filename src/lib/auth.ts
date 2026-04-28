'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { anonSdk, createAuthedSdk, getSessionKey, SESSION_COOKIE } from './recursiv';

const ORG_ID = process.env.RECURSIV_ORG_ID;

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

export async function signUp(input: { name: string; email: string; password: string }): Promise<SessionUser> {
  if (!ORG_ID) throw new Error('RECURSIV_ORG_ID env var is not set.');
  const r = await anonSdk();
  const result = await r.auth.signUpAndCreateKey(
    { name: input.name, email: input.email, password: input.password },
    {
      name: `app-session-${Date.now()}`,
      scopes: USER_KEY_SCOPES,
      organizationId: ORG_ID,
    },
  );
  setSessionCookie(result.apiKey);
  return result.user as SessionUser;
}

export async function signIn(input: { email: string; password: string }): Promise<SessionUser> {
  if (!ORG_ID) throw new Error('RECURSIV_ORG_ID env var is not set.');
  const r = await anonSdk();
  const result = await r.auth.signInAndCreateKey(
    { email: input.email, password: input.password },
    {
      name: `app-session-${Date.now()}`,
      scopes: USER_KEY_SCOPES,
      organizationId: ORG_ID,
    },
  );
  setSessionCookie(result.apiKey);
  return result.user as SessionUser;
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect('/sign-in');
}

export async function getSession(): Promise<SessionUser | null> {
  const apiKey = await getSessionKey();
  if (!apiKey) return null;
  try {
    const sdk = await createAuthedSdk(apiKey);
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
