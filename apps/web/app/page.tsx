import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();
  const launchLocality = municipalities[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 lg:gap-12 lg:py-12">
      <section
        className="relative min-h-[410px] overflow-hidden rounded-[1.75rem] bg-moss text-white shadow-card lg:min-h-[450px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(20, 42, 39, 0.94) 0%, rgba(20, 42, 39, 0.78) 46%, rgba(20, 42, 39, 0.24) 100%), url('/images/manheim-hero.png')",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="flex min-h-[410px] flex-col justify-between px-7 py-8 lg:min-h-[450px] lg:px-10 lg:py-9">
          <div className="max-w-4xl space-y-5">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Source-linked civic dashboard
            </span>
            <h1 className="font-serif text-5xl leading-[0.98] text-sand sm:text-6xl lg:text-[5rem]">
              The Local Record
            </h1>
            <p className="text-pretty max-w-3xl text-lg leading-8 text-white/84">
              A resident-run way to track township meetings, planning items,
              public notices, road impacts, parks, and source documents in one
              searchable place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${launchLocality.slug}`}
                className="rounded-full bg-sand px-6 py-3 text-sm font-semibold text-moss transition hover:bg-white"
              >
                Open Manheim dashboard
              </Link>
              <Link
                href={`/${launchLocality.slug}?q=Ashford%20Meadows#records`}
                className="rounded-full border border-white/24 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                Try a project search
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            <div className="border-t border-white/24 pt-4">
              <p className="font-semibold text-sand">
                {launchLocality.shortName}
              </p>
              <p className="mt-2 leading-6 text-white/72">
                First live locality
              </p>
            </div>
            <div className="border-t border-white/24 pt-4">
              <p className="font-semibold text-sand">Searchable record</p>
              <p className="mt-2 leading-6 text-white/72">
                Projects, addresses, ordinances, meetings
              </p>
            </div>
            <div className="border-t border-white/24 pt-4">
              <p className="font-semibold text-sand">Weekly digest ready</p>
              <p className="mt-2 leading-6 text-white/72">
                Email updates built from the same source trail
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="rounded-[1.5rem] border border-white/75 bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Live now
          </p>
          <h2 className="text-balance mt-3 font-serif text-4xl leading-tight text-moss">
            One live locality, built as a repeatable community tool
          </h2>
          <p className="text-pretty mt-4 max-w-3xl text-base leading-8 text-ink/75">
            Manheim Township is the first full dashboard. The public page now
            combines a briefing layer, watchlist searches, place-based context,
            source inventory, and a source-grounded question box.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${launchLocality.slug}#records`}
              className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
            >
              Search Manheim records
            </Link>
            <Link
              href={`/${launchLocality.slug}/source-inventory`}
              className="rounded-full border border-moss/15 bg-white px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
            >
              See tracked sources
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/75 bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Community value
          </p>
          <h2 className="text-balance mt-3 font-serif text-4xl leading-tight text-moss">
            Useful when a resident has one concrete question
          </h2>
          <p className="text-pretty mt-4 text-base leading-8 text-ink/75">
            Instead of "read everything," the product is now oriented around
            finding the record behind a project, tracking what is next, and
            opening the official source before acting.
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
