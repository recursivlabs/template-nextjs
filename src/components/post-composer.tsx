'use client';

import { useState, useTransition } from 'react';
import { createPost } from '@/actions/posts';
import { cn } from '@/lib/utils';

interface PostComposerProps {
  onPostCreated: () => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isPending) return;

    startTransition(async () => {
      try {
        await createPost(content.trim());
        setContent('');
        onPostCreated();
      } catch (err) {
        console.error('Failed to create post:', err);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write something... (Markdown supported)"
        rows={3}
        className="w-full resize-none bg-transparent text-sm text-[var(--fg)] placeholder-[var(--muted)] outline-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">Markdown supported</span>
        <button
          type="submit"
          disabled={!content.trim() || isPending}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            content.trim() && !isPending
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          )}
        >
          {isPending ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
