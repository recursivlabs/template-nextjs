'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getRecursiv } from './recursiv';

const COOKIE = 'recursiv_session';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function signUp(input: { name: string; email: string; password: string }) {
  const r = getRecursiv();
  const session = await r.auth.signUp(input);
  cookies().set(COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return session.user as SessionUser;
}

export async function signIn(input: { email: string; password: string }) {
  const r = getRecursiv();
  const session = await r.auth.signIn(input);
  cookies().set(COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return session.user as SessionUser;
}

export async function signOut() {
  const r = getRecursiv();
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    try { await r.auth.signOut(token); } catch { /* token may already be invalid */ }
  }
  cookies().delete(COOKIE);
  redirect('/sign-in');
}

export async function getSession(): Promise<SessionUser | null> {
  const r = getRecursiv();
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await r.auth.getSession(token);
    if (!session) return null;
    return session.user as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/sign-in');
  return user;
}
