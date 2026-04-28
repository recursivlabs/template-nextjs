import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        {children}
      </div>
    </main>
  );
}
