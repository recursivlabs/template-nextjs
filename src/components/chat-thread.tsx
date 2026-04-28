'use client';

import { useRef, useState, useTransition } from 'react';
import type { Message } from '@/lib/chat';
import { sendMessage } from '@/actions/chat';

export function ChatThread({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      <ul className="space-y-2 rounded-2xl border border-neutral-200 p-4 bg-white min-h-[300px]">
        {messages.length === 0 ? (
          <li className="text-sm text-neutral-400">No messages yet.</li>
        ) : (
          messages.map((m) => (
            <li key={m.id} className="text-sm">
              <span className="font-medium">{m.sender?.name ?? 'Unknown'}: </span>
              <span>{m.content}</span>
            </li>
          ))
        )}
      </ul>

      <form
        ref={formRef}
        className="flex gap-2"
        action={(fd) => {
          fd.set('conversation_id', conversationId);
          const content = String(fd.get('content') ?? '').trim();
          if (!content) return;
          setError(null);
          startTransition(async () => {
            const tmpId = `tmp-${Date.now()}`;
            const optimistic: Message = {
              id: tmpId,
              content,
              sender: { id: 'me', name: 'You', username: '', image: null, is_ai: false },
              reply_to_id: null,
              media: [],
              reactions: [],
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimistic]);
            const res = await sendMessage(fd);
            if (res?.error) {
              setError(res.error);
              setMessages((prev) => prev.filter((m) => m.id !== tmpId));
            } else {
              formRef.current?.reset();
            }
          });
        }}
      >
        <input
          name="content"
          required
          placeholder="Message…"
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
