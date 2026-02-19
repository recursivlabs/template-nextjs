import { SandboxRunner } from '@/components/sandbox-runner';

export default function SandboxPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Code Sandbox</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Execute code in a cloud sandbox. Supports TypeScript, JavaScript, and Python.
      </p>
      <SandboxRunner />
    </div>
  );
}
