import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();
  const launchLocality = municipalities[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:gap-12 lg:py-14">
      <section className="overflow-hidden rounded-[2.5rem] bg-moss text-white shadow-card">
        <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.18fr_0.82fr] lg:items-end lg:px-10 lg:py-11">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Platform home
            </span>
            <div className="space-y-4">
              <h1 className="text-balance max-w-4xl font-serif text-4xl leading-[1.04] text-sand sm:text-5xl lg:text-[3.8rem]">
                Follow local government updates without digging through five
                township pages first.
              </h1>
              <p className="text-pretty max-w-3xl text-lg leading-8 text-white/80">
                The Local Record turns scattered notices, meetings, planning
                items, and local alerts into a cleaner, source-linked digest
                residents can actually use.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/localities"
                className="rounded-full bg-sand px-6 py-3 text-sm font-semibold text-moss transition hover:bg-white"
              >
                Browse localities
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Learn about the project
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
              Current launch
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-sand">
              {launchLocality.shortName}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/78">
              Read the live digest now, or get ready for a weekly email roundup
              built around the same source-linked locality feed.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/${launchLocality.slug}`}
                className="rounded-full bg-sand px-5 py-3 text-sm font-semibold text-moss transition hover:bg-white"
              >
                Open digest
              </Link>
              <Link
                href={`/${launchLocality.slug}#newsletter`}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Get weekly email
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Live now
          </p>
          <h2 className="text-balance mt-3 font-serif text-4xl leading-tight text-moss">
            One live locality, built to expand
          </h2>
          <p className="text-pretty mt-4 max-w-3xl text-base leading-8 text-ink/75">
            Manheim Township is the first full digest. The platform structure,
            source inventory, and locality pages are already built to support
            more municipalities as they go live.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${launchLocality.slug}`}
              className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
            >
              Open Manheim digest
            </Link>
            <Link
              href="/localities"
              className="rounded-full border border-moss/15 bg-white px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
            >
              Browse localities
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Weekly digest
          </p>
          <h2 className="text-balance mt-3 font-serif text-4xl leading-tight text-moss">
            Get the week in one email
          </h2>
          <p className="text-pretty mt-4 text-base leading-8 text-ink/75">
            Each locality can have its own weekly roundup built from the same
            source-linked record. Subscribe from the locality page and manage
            your preferences from your personal link.
          </p>
          <div className="mt-6">
            <Link
              href={`/${launchLocality.slug}#newsletter`}
              className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
            >
              Subscribe to weekly updates
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
