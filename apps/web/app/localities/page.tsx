import Link from "next/link";

import { LocalitiesMap } from "../../components/localities-map";
import { getLocalitiesDirectory } from "../../lib/data";

export default function LocalitiesPage() {
  const localities = getLocalitiesDirectory();
  const activeLocality = localities[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">Locality selector</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Choose a locality
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/70">
          The Local Record is organized by locality. Pick a municipality to view
          its digest, source inventory, corrections page, and future archive
          pages.
        </p>
        <p className="mt-5 rounded-lg border border-ink/10 bg-white p-4 text-sm leading-7 text-ink/65">
          Each locality keeps its own public digest and source pages underneath
          its own slug.
        </p>
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <p className="text-sm font-semibold text-moss">Live localities</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">
            Available now
          </h2>
          <p className="mt-3 text-sm leading-7 text-ink/70">
            More municipalities can be added over time. For now, the directory
            points to the first live launch.
          </p>
        </div>

        {localities.map((locality) => (
          <article
            key={locality.slug}
            className="rounded-lg border border-ink/10 bg-white p-5"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                  {locality.statusLabel}
                </span>
                <span className="text-sm text-ink/55">{locality.county}</span>
              </div>
              <h3 className="font-serif text-3xl leading-tight text-ink">
                {locality.shortName}
              </h3>
              <p className="max-w-2xl text-base leading-7 text-ink/70">
                {locality.about}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${locality.slug}`}
                className="rounded-md bg-moss px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-moss/90"
              >
                Open digest
              </Link>
              <Link
                href={`/${locality.slug}/source-inventory`}
                className="rounded-md border border-moss/15 bg-white px-5 py-3 text-center text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                View sources
              </Link>
            </div>
          </article>
        ))}
      </section>

      <LocalitiesMap activeSlug={activeLocality?.slug ?? ""} />
    </div>
  );
}
