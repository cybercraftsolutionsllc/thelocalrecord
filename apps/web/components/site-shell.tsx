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
  { href: "/", label: "Home" },
  { href: "/localities", label: "Locality" },
  { href: "/about", label: "About" },
  { href: "/policy", label: "Policy" },
  { href: "/corrections", label: "Corrections" }
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
    <div className="min-h-screen text-ink">
      <header className="border-b border-ink/10 bg-[#fbf7ef]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link href="/" className="inline-flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-moss/15 bg-sky/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-moss">
                Independent digest
              </span>
              <span className="font-serif text-[2rem] leading-none text-moss">
                The Local Record
              </span>
            </Link>
            <p className="max-w-2xl text-sm leading-6 text-ink/68">
              {PLATFORM_DISCLAIMER}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 text-sm lg:justify-end">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-ink/10 bg-[#fcfaf4]/92 px-4 py-2 text-ink/80 transition hover:border-moss/30 hover:bg-sky/40 hover:text-moss"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-ink/10 bg-[#fbf7ef]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-ink/70 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-ink">{PLATFORM_DISCLAIMER}</p>
            <p className="max-w-2xl leading-6">
              Locality pages carry municipality-specific independence language
              and source-linked updates.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { href: "/about", label: "About" },
              { href: "/corrections", label: "Report an issue" },
              { href: "/policy", label: "Policy" },
              { href: "/localities", label: "Locality" }
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
