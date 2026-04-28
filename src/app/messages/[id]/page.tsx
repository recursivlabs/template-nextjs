import Link from 'next/link';
import { loadMessages } from '@/actions/chat';
import { ChatThread } from '@/components/chat-thread';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const messages = await loadMessages(params.id);
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/messages" className="text-sm text-neutral-500 hover:text-black">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Conversation</h1>
      </header>
      <ChatThread conversationId={params.id} initialMessages={messages} />
    </main>
  );
}
