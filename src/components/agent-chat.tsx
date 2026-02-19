'use client';

import { useState, useRef, useEffect } from 'react';
import type { Agent } from '@recursiv/sdk';
import { MessageBubble } from './message-bubble';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'agent';
}

interface AgentChatProps {
  agents: Agent[];
}

export function AgentChat({ agents }: AgentChatProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]!);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function switchAgent(agent: Agent) {
    setSelectedAgent(agent);
    setMessages([]);
    setConversationId(undefined);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), content: userMessage, role: 'user' };
    const agentMsg: Message = { id: crypto.randomUUID(), content: '', role: 'agent' };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversation_id: conversationId }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(line.slice(6));

            if (chunk.type === 'text_delta' && chunk.delta) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1]!;
                updated[updated.length - 1] = { ...last, content: last.content + chunk.delta };
                return updated;
              });
            } else if (chunk.type === 'done') {
              if (chunk.conversation_id) {
                setConversationId(chunk.conversation_id);
              }
            } else if (chunk.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1]!;
                updated[updated.length - 1] = {
                  ...last,
                  content: `Error: ${chunk.error}`,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1]!;
        updated[updated.length - 1] = {
          ...last,
          content: `Error: ${err instanceof Error ? err.message : 'Connection failed'}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Agent sidebar */}
      {agents.length > 1 && (
        <div className="w-56 shrink-0 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => switchAgent(agent)}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                selectedAgent.id === agent.id
                  ? 'bg-accent-subtle text-accent'
                  : 'text-[var(--muted)] hover:text-[var(--fg)]'
              )}
            >
              <div className="font-medium">{agent.name}</div>
              <div className="text-xs opacity-60">{agent.model}</div>
            </button>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {/* Header */}
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="font-medium">{selectedAgent.name}</div>
          <div className="text-xs text-[var(--muted)]">{selectedAgent.model}</div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
              Send a message to start chatting with {selectedAgent.name}
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              role={msg.role}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'agent'}
            />
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-[var(--border)] p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${selectedAgent.name}...`}
              disabled={isStreaming}
              className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-[var(--muted)] focus:border-accent"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                'rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
                input.trim() && !isStreaming
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              )}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
