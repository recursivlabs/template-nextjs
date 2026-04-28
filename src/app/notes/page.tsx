import { listNotes } from '@/actions/notes';
import { NoteComposer } from '@/components/note-composer';
import { NoteList } from '@/components/note-list';

export default async function NotesPage() {
  const notes = await listNotes();
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Notes</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Stored in Recursiv-managed Postgres via <code>r.databases</code>.
        </p>
      </header>
      <NoteComposer />
      <NoteList notes={notes} />
    </main>
  );
}
