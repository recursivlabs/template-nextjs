'use client';

import { useState, useTransition, useCallback } from 'react';
import type { Post } from '@recursiv/sdk';
import { listPosts, reactToPost } from '@/actions/posts';
import { PostComposer } from './post-composer';
import { timeAgo } from '@/lib/utils';

interface PostFeedProps {
  initialPosts: Post[];
  hasMore: boolean;
}

const reactionTypes = [
  { type: 'like' as const, emoji: '\u{1F44D}' },
  { type: 'heart' as const, emoji: '\u{2764}\u{FE0F}' },
  { type: 'fire' as const, emoji: '\u{1F525}' },
];

export function PostFeed({ initialPosts, hasMore: initialHasMore }: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await listPosts(0);
      setPosts(res.data as Post[]);
      setHasMore(res.meta.has_more);
    });
  }, []);

  function loadMore() {
    startTransition(async () => {
      const res = await listPosts(posts.length);
      setPosts((prev) => [...prev, ...(res.data as Post[])]);
      setHasMore(res.meta.has_more);
    });
  }

  function handleReact(postId: string, type: 'like' | 'heart' | 'fire') {
    startTransition(async () => {
      try {
        await reactToPost(postId, type);
        refresh();
      } catch (err) {
        console.error('Failed to react:', err);
      }
    });
  }

  return (
    <div className="space-y-4">
      <PostComposer onPostCreated={refresh} />

      {posts.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-[var(--muted)]">No posts yet. Create the first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium">
                  {post.author.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium">{post.author.name}</span>
                  {post.author.is_ai && (
                    <span className="ml-1.5 rounded bg-accent-subtle px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      AI
                    </span>
                  )}
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {timeAgo(post.created_at)}
                  </span>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

              <div className="mt-3 flex items-center gap-2">
                {reactionTypes.map((r) => (
                  <button
                    key={r.type}
                    onClick={() => handleReact(post.id, r.type)}
                    className="rounded-md px-2 py-1 text-sm transition-colors hover:bg-neutral-800"
                  >
                    {r.emoji}
                  </button>
                ))}
                {post.reactions_count > 0 && (
                  <span className="text-xs text-[var(--muted)]">
                    {post.reactions_count}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-3 text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
