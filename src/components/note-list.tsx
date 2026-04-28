'use client';

import { useTransition } from 'react';
import type { Note } from '@/actions/notes';
import { deleteNote } from '@/actions/notes';

export function NoteList({ notes }: { notes: Note[] }) {
  const [pending, startTransition] = useTransition();

  if (notes.length === 0) {
    return <p className="text-sm text-neutral-500">No notes yet. Add one above.</p>;
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li key={note.id} className="rounded-2xl border border-neutral-200 p-4 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">{note.title}</h3>
              {note.body ? (
                <p className="text-sm text-neutral-600 mt-1 whitespace-pre-wrap">{note.body}</p>
              ) : null}
              <p className="text-xs text-neutral-400 mt-2">
                {new Date(note.created_at).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => deleteNote(note.id))}
              className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
