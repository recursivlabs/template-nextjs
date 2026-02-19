import { listPosts } from '@/actions/posts';
import { PostFeed } from '@/components/post-feed';

export default async function FeedPage() {
  try {
    const res = await listPosts(0);
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Feed</h1>
        <PostFeed initialPosts={res.data} hasMore={res.meta.has_more} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <h2 className="mb-2 text-lg font-semibold text-red-400">Could not load feed</h2>
        <p className="text-sm text-[var(--muted)]">
          Check that your <code className="font-mono text-accent">RECURSIV_API_KEY</code> is set in{' '}
          <code className="font-mono">.env</code>
        </p>
      </div>
    );
  }
}
