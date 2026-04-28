import Link from 'next/link';
import { tryAuthedSdk } from '@/lib/recursiv';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const sdk = await tryAuthedSdk();
  if (!sdk) return null;
  const [user, agents, posts] = await Promise.allSettled([
    sdk.users.me(),
    sdk.agents.list({ limit: 5 }),
    sdk.posts.list({ limit: 5 }),
  ]);
  return {
    user: user.status === 'fulfilled' ? user.value.data : null,
    agentCount: agents.status === 'fulfilled' ? agents.value.data.length : 0,
    latestPost:
      posts.status === 'fulfilled' && posts.value.data.length > 0
        ? posts.value.data[0]
        : null,
  };
}

const features = [
  {
    href: '/notes',
    title: 'Notes',
    description: 'Postgres-backed notes via r.databases — your structured data lives here.',
    badge: 'Database',
  },
  {
    href: '/upload',
    title: 'Files',
    description: 'Direct-to-bucket uploads via r.storage presigned URLs.',
    badge: 'Storage',
  },
  {
    href: '/messages',
    title: 'Messages',
    description: 'DMs and group chats via r.chat. Plug in r.realtime for live updates.',
    badge: 'Chat',
  },
  {
    href: '/agents',
    title: 'Agents',
    description: 'Talk to AI agents with streaming responses via r.agents.',
    badge: 'AI',
  },
  {
    href: '/feed',
    title: 'Feed',
    description: 'Social posts and reactions via r.posts.',
    badge: 'Social',
  },
  {
    href: '/sandbox',
    title: 'Sandbox',
    description: 'Run code in a cloud sandbox via r.sandbox.',
    badge: 'Compute',
  },
];

export default async function HomePage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome</h1>
        <p className="text-[var(--muted)]">
          Sign in or create an account to start using the app.
        </p>
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--card)]"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const { user, agentCount, latestPost } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {user ? `Welcome, ${user.name}` : 'Welcome'}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Your app is connected to the Recursiv API. Start building.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-2xl font-bold text-accent">{agentCount}</div>
          <div className="text-xs text-[var(--muted)]">Agents</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="truncate text-2xl font-bold text-accent">
            {latestPost ? latestPost.author.name : '--'}
          </div>
          <div className="text-xs text-[var(--muted)]">Latest post by</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-2xl font-bold text-accent">
            {user ? '\u{2713}' : '\u{2717}'}
          </div>
          <div className="text-xs text-[var(--muted)]">Signed in</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-accent/30"
          >
            <div className="mb-3 inline-block rounded bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
              {feature.badge}
            </div>
            <h2 className="mb-1 text-lg font-semibold group-hover:text-accent transition-colors">
              {feature.title}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
