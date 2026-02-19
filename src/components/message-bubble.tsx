import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'agent';
  isStreaming?: boolean;
}

export function MessageBubble({ content, role, isStreaming }: MessageBubbleProps) {
  return (
    <div className={cn('flex', role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
          role === 'user'
            ? 'bg-accent text-white'
            : 'bg-neutral-800 text-[var(--fg)]'
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-[var(--muted)]" />
          )}
        </div>
      </div>
    </div>
  );
}
