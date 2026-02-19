'use client';

import { useState, useTransition } from 'react';
import { executeCode } from '@/actions/sandbox';
import { cn } from '@/lib/utils';

type Language = 'typescript' | 'javascript' | 'python';

const languages: { id: Language; label: string }[] = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
];

const defaultCode: Record<Language, string> = {
  typescript: `const greeting = "Hello from Recursiv!";
console.log(greeting);

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);
console.log("Doubled:", doubled);`,

  javascript: `const greeting = "Hello from Recursiv!";
console.log(greeting);

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);
console.log("Doubled:", doubled);`,

  python: `greeting = "Hello from Recursiv!"
print(greeting)

numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]
print("Doubled:", doubled)`,
};

export function SandboxRunner() {
  const [language, setLanguage] = useState<Language>('typescript');
  const [code, setCode] = useState(defaultCode.typescript);
  const [output, setOutput] = useState<string | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function switchLanguage(lang: Language) {
    setLanguage(lang);
    setCode(defaultCode[lang]);
    setOutput(null);
    setExitCode(null);
    setExecTime(null);
    setError(null);
  }

  function handleRun() {
    if (!code.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        const res = await executeCode(code, language);
        setOutput(res.data.output);
        setExitCode(res.data.exitCode);
        setExecTime(res.data.executionTime);
        setRemaining(res.meta.remaining_executions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Execution failed');
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Language tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => switchLanguage(lang.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              language === lang.id
                ? 'bg-accent-subtle text-accent'
                : 'text-[var(--muted)] hover:text-[var(--fg)]'
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Code editor */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <span className="text-xs text-[var(--muted)]">Code</span>
          <button
            onClick={handleRun}
            disabled={!code.trim() || isPending}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              code.trim() && !isPending
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            )}
          >
            {isPending ? 'Running...' : 'Run'}
          </button>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-[var(--fg)] outline-none"
          rows={10}
        />
      </div>

      {/* Output */}
      {(output !== null || error) && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
            <span className="text-xs text-[var(--muted)]">Output</span>
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              {execTime !== null && <span>{execTime}ms</span>}
              {exitCode !== null && (
                <span className={exitCode === 0 ? 'text-accent' : 'text-red-400'}>
                  exit {exitCode}
                </span>
              )}
            </div>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
            {error ? (
              <span className="text-red-400">{error}</span>
            ) : (
              output
            )}
          </pre>
          {remaining !== null && (
            <div className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
              {remaining} executions remaining today
            </div>
          )}
        </div>
      )}
    </div>
  );
}
