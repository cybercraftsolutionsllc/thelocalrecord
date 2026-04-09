import Link from "next/link";

import { LocalitiesMap } from "../../components/localities-map";
import { getLocalitiesDirectory } from "../../lib/data";

export default function LocalitiesPage() {
  const localities = getLocalitiesDirectory();
  const activeLocality = localities[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <section className="rounded-[2rem] bg-white px-8 py-10 shadow-card">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Locality selector</p>
            <h1 className="font-serif text-5xl text-moss">Choose a locality</h1>
            <p className="max-w-3xl text-lg leading-8 text-ink/75">
              The Local Record is organized by locality. Pick a municipality to view its digest,
              source inventory, corrections page, and future archive pages.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-clay/20 bg-sand/50 p-5 text-sm leading-7 text-ink/75">
            This selector page is platform-wide. Each locality keeps its own public digest and source
            pages underneath its own slug.
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <LocalitiesMap activeSlug={activeLocality?.slug ?? ""} />

        <div className="space-y-4">
          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Live localities</p>
            <h2 className="mt-2 font-serif text-3xl text-moss">Available now</h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              More municipalities can be added over time. For now, the directory points to the first
              live launch.
            </p>
          </div>

          {localities.map((locality) => (
            <article
              key={locality.slug}
              className="rounded-[2rem] border border-ink/10 bg-white p-6 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                      {locality.statusLabel}
                    </span>
                    <span className="text-sm text-ink/55">{locality.county}</span>
                  </div>
                  <h3 className="font-serif text-3xl text-moss">{locality.shortName}</h3>
                  <p className="max-w-2xl text-base leading-7 text-ink/75">{locality.about}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/${locality.slug}`}
                  className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
                >
                  Open digest
                </Link>
                <Link
                  href={`/${locality.slug}/source-inventory`}
                  className="rounded-full border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
                >
                  View sources
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
