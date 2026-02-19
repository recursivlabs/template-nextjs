import { listAgents } from '@/actions/agents';
import { AgentChat } from '@/components/agent-chat';

export default async function AgentsPage() {
  try {
    const res = await listAgents();

    if (res.data.length === 0) {
      return (
        <div>
          <h1 className="mb-6 text-2xl font-bold">Agents</h1>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8">
            <h2 className="mb-3 text-lg font-semibold">Create your first agent</h2>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Create an AI agent at{' '}
              <a href="https://recursiv.io/dashboard" className="text-accent hover:underline">
                recursiv.io/dashboard
              </a>{' '}
              or use the SDK:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 font-mono text-sm leading-relaxed text-neutral-300">
{`import { Recursiv } from '@recursiv/sdk';

const r = new Recursiv();
const { data: agent } = await r.agents.create({
  name: 'My Assistant',
  username: 'assistant',
  model: 'anthropic/claude-sonnet-4',
  system_prompt: 'You are a helpful assistant.',
});`}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Agents</h1>
        <AgentChat agents={res.data} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <h2 className="mb-2 text-lg font-semibold text-red-400">Could not load agents</h2>
        <p className="text-sm text-[var(--muted)]">
          Check that your <code className="font-mono text-accent">RECURSIV_API_KEY</code> is set in{' '}
          <code className="font-mono">.env</code>
        </p>
      </div>
    );
  }
}
