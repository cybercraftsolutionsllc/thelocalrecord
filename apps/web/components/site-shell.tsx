"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SiteShellProps = {
  children: ReactNode;
};

const PLATFORM_DISCLAIMER =
  "Independent resident-run digest platform. Not an official municipal website.";

const navItems = [
  { href: "/", label: "Search" },
  { href: "/my-record", label: "My Record" },
  { href: "/manheimtownshippa", label: "Manheim" },
  { href: "/about", label: "About" },
  { href: "/policy", label: "Rules" }
];

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const normalizedPathname =
    pathname && pathname !== "/"
      ? pathname.replace(/\/+$/, "")
      : (pathname ?? "/");
  const visibleNavItems = navItems.filter(
    (item) => item.href !== normalizedPathname
  );

  return (
    <div className="record-shell min-h-screen text-ink">
      <header className="record-glass border-b border-white/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="/icon.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-lg shadow-card"
            />
            <span className="flex flex-col">
              <span className="font-serif text-2xl leading-none text-moss">
                The Local Record
              </span>
              <span className="text-sm text-ink/50">resident utility</span>
            </span>
          </Link>

          <nav className="flex gap-1 overflow-x-auto text-sm">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-ink/68 transition hover:bg-sky/55 hover:text-moss"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="record-glass border-t border-white/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 text-sm text-ink/62 sm:px-6">
          <div className="space-y-1">
            <p className="font-semibold text-ink">{PLATFORM_DISCLAIMER}</p>
            <p className="max-w-2xl leading-6 text-ink/58">
              Source-linked local updates for residents.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { href: "/about", label: "About" },
              { href: "/corrections", label: "Fix a detail" },
              { href: "/policy", label: "Policy" },
              { href: "/localities", label: "Localities" }
            ]
              .filter((item) => item.href !== normalizedPathname)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-moss"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
