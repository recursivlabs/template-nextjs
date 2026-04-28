'use client';

import { useRef, useState, useTransition } from 'react';
import { createNote } from '@/actions/notes';

export function NoteComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="space-y-3 rounded-2xl border border-neutral-200 p-4 bg-white"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const res = await createNote(fd);
          if (res?.error) setError(res.error);
          else formRef.current?.reset();
        });
      }}
    >
      <input
        name="title"
        required
        placeholder="Title"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2"
      />
      <textarea
        name="body"
        rows={3}
        placeholder="Notes…"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
