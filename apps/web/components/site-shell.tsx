import type { ReactNode } from "react";

import Link from "next/link";

import { PLATFORM_DISCLAIMER } from "@thelocalrecord/core";

type SiteShellProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/manheimtownshippa", label: "Locality" },
  { href: "/about", label: "About" },
  { href: "/policy", label: "Policy" },
  { href: "/corrections", label: "Corrections" }
];

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-sand text-ink">
      <header className="border-b border-ink/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="rounded-full border border-moss/15 bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-moss">
                Independent digest
              </span>
              <span className="font-serif text-2xl text-moss">The Local Record</span>
            </Link>
            <p className="max-w-2xl text-sm text-ink/70">{PLATFORM_DISCLAIMER}</p>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-ink/10 px-4 py-2 text-ink/80 transition hover:border-moss hover:text-moss"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-ink/70 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-ink">{PLATFORM_DISCLAIMER}</p>
            <p>Locality pages carry municipality-specific independence language and source-linked updates.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-moss">
              About
            </Link>
            <Link href="/corrections" className="hover:text-moss">
              Report an issue
            </Link>
            <Link href="/policy" className="hover:text-moss">
              Policy
            </Link>
            <Link href="/manheimtownshippa" className="hover:text-moss">
              Locality
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
