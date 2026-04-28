import Link from 'next/link';
import { listConversations } from '@/actions/chat';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const conversations = await listConversations();
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Messages</h1>
        <p className="text-sm text-neutral-500 mt-1">
          DMs and group chats via <code>r.chat</code>. Real-time updates can be wired up with{' '}
          <code>r.realtime</code>.
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 p-6 bg-white">
          <p className="text-sm text-neutral-500">
            No conversations yet. Ask Claude to start a DM with a teammate (it will use{' '}
            <code>r.chat.dm</code>) or create a group with <code>r.chat.createGroup</code>.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="block rounded-2xl border border-neutral-200 px-4 py-3 bg-white hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{c.name ?? c.id}</h3>
                  {c.last_message ? (
                    <span className="text-xs text-neutral-400">
                      {new Date(c.last_message.created_at).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                {c.last_message ? (
                  <p className="text-sm text-neutral-500 mt-1 truncate">{c.last_message.content}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
