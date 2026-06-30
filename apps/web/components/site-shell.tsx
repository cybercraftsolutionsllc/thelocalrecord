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
    <div className="record-shell min-h-screen text-sand">
      <header className="record-glass sticky top-0 z-30 border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="/icon.svg"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 rounded-md"
            />
            <span className="flex flex-col">
              <span className="text-xl font-semibold leading-none tracking-tight text-white">
                The Local Record
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-sky/70">
                resident utility
              </span>
            </span>
          </Link>

          <nav className="flex gap-1 overflow-x-auto text-sm lg:justify-end">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 font-medium text-white/64 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="record-glass border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-white/58 sm:px-6">
          <div className="space-y-1">
            <p className="font-semibold text-white">{PLATFORM_DISCLAIMER}</p>
            <p className="max-w-2xl leading-6 text-white/52">
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
                  className="hover:text-white"
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
