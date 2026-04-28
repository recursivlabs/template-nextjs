'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Home' },
  { href: '/notes', label: 'Notes' },
  { href: '/upload', label: 'Files' },
  { href: '/messages', label: 'Messages' },
  { href: '/agents', label: 'Agents' },
  { href: '/feed', label: 'Feed' },
  { href: '/sandbox', label: 'Sandbox' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          Recursiv
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent-subtle text-accent'
                    : 'text-[var(--muted)] hover:text-[var(--fg)]'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
