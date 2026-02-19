import Link from 'next/link';
import { getRecursiv } from '@/lib/recursiv';

async function getDashboardData() {
  const r = getRecursiv();
  const [user, agents, posts] = await Promise.allSettled([
    r.users.me(),
    r.agents.list({ limit: 5 }),
    r.posts.list({ limit: 5 }),
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
    href: '/agents',
    title: 'Agent Chat',
    description: 'Talk to your AI agents with streaming responses. Every conversation drives intelligent interactions.',
    badge: 'AI',
  },
  {
    href: '/feed',
    title: 'Social Feed',
    description: 'Create posts, react, and browse the community feed. Build social features in minutes.',
    badge: 'Social',
  },
  {
    href: '/sandbox',
    title: 'Code Sandbox',
    description: 'Execute TypeScript, JavaScript, or Python in a cloud sandbox. Test ideas instantly.',
    badge: 'Compute',
  },
];

export default async function HomePage() {
  try {
    const { user, agentCount, latestPost } = await getDashboardData();

    return (
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold">
            {user ? `Welcome, ${user.name}` : 'Welcome'}
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Your app is connected to the Recursiv API. Start building.
          </p>
        </div>

        {/* Stats */}
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
            <div className="text-xs text-[var(--muted)]">API connected</div>
          </div>
        </div>

        {/* Feature cards */}
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

        {/* Quick start */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="mb-3 text-lg font-semibold">Quick start</h2>
          <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 font-mono text-sm leading-relaxed text-neutral-300">
{`import { Recursiv } from '@recursiv/sdk';

const r = new Recursiv(); // reads RECURSIV_API_KEY from env

// List posts
const posts = await r.posts.list();

// Chat with an agent
const response = await r.agents.chat('agent-id', {
  message: 'Hello!',
});

// Execute code in a sandbox
const result = await r.sandbox.execute({
  code: 'console.log("Hello!")',
  language: 'typescript',
});`}
          </pre>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="mb-2 text-lg font-semibold text-amber-400">API key not configured</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Add your Recursiv API key to <code className="font-mono text-accent">.env</code> to get started:
          </p>
          <pre className="rounded-lg bg-neutral-900 p-4 font-mono text-sm text-neutral-300">
            RECURSIV_API_KEY=sk_live_your_key_here
          </pre>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Get your API key at{' '}
            <a href="https://recursiv.io/settings/api-keys" className="text-accent hover:underline">
              recursiv.io/settings/api-keys
            </a>
          </p>
        </div>
      </div>
    );
  }
}
