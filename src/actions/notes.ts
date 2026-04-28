'use server';

import { revalidatePath } from 'next/cache';
import { query, migrate } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export type Note = {
  id: number;
  title: string;
  body: string;
  user_id: string;
  created_at: string;
};

let _migrated = false;
async function ensureSchema() {
  if (_migrated) return;
  await migrate([
    `CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id)`,
  ]);
  _migrated = true;
}

export async function listNotes(): Promise<Note[]> {
  const user = await requireSession();
  await ensureSchema();
  return query<Note>(
    'SELECT id, title, body, user_id, created_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id],
  );
}

export async function createNote(formData: FormData) {
  const user = await requireSession();
  await ensureSchema();
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  if (!title) return { error: 'Title is required.' };
  await query('INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3)', [title, body, user.id]);
  revalidatePath('/notes');
  return { ok: true };
}

export async function deleteNote(id: number) {
  const user = await requireSession();
  await query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, user.id]);
  revalidatePath('/notes');
}
