'use server';

import { redirect } from 'next/navigation';
import { signUp as signUpLib, signIn as signInLib, signOut as signOutLib } from '@/lib/auth';

export async function signUpAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!name || !email || !password) {
    return { error: 'All fields are required.' };
  }
  try {
    await signUpLib({ name, email, password });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign up failed.' };
  }
  redirect('/');
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  try {
    await signInLib({ email, password });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign in failed.' };
  }
  redirect('/');
}

export async function signOutAction() {
  await signOutLib();
}
