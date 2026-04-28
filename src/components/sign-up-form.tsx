'use client';

import { useState, useTransition } from 'react';
import { signUpAction } from '@/actions/auth';

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await signUpAction(formData);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <input
        name="name"
        type="text"
        required
        placeholder="Your name"
        autoComplete="name"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        autoComplete="email"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password (min 8 characters)"
        autoComplete="new-password"
        minLength={8}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-black text-white py-2 font-medium disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
