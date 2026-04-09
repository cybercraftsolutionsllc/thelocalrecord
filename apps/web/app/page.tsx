import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 lg:gap-14 lg:py-14">
      <section className="overflow-hidden rounded-[2.5rem] bg-moss text-white shadow-card">
        <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start lg:px-10 lg:py-11">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Platform home
            </span>
            <div className="space-y-4">
              <h1 className="text-balance max-w-4xl font-serif text-4xl leading-[1.04] text-sand sm:text-5xl lg:text-[3.8rem]">
                Clear local updates, available in one place and linked back to
                the source.
              </h1>
              <p className="text-pretty max-w-3xl text-lg leading-8 text-white/80">
                The Local Record makes public municipal information easier to
                follow with readable locality pages, direct source links, and a
                clear independence disclaimer.
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

          <div className="grid gap-4 self-start rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
                What the platform does
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                <li>Puts important local updates in one readable place.</li>
                <li>
                  Helps residents scan meetings, notices, and planning items
                  faster.
                </li>
                <li>Links every entry back to the original source.</li>
              </ul>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
                What this is not
              </p>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Not an official township website, not a proxy for public
                notices, and not a place for unsupported interpretation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="self-start rounded-[2rem] bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Why it exists
          </p>
          <h2 className="text-balance mt-3 font-serif text-4xl leading-tight text-moss">
            A simpler way to keep up
          </h2>
          <p className="text-pretty mt-4 max-w-3xl text-base leading-8 text-ink/75">
            Township websites often spread important information across
            calendars, news posts, agendas, minutes, and department pages. The
            Local Record pulls that into a clearer digest without pretending to
            be the township itself.
          </p>
          <div className="mt-6">
            <Link href="/about" className="text-sm font-semibold text-moss">
              Read more about the project
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-ink/10 bg-white p-8 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Live localities
              </p>
              <h2 className="text-balance mt-2 font-serif text-4xl leading-tight text-moss">
                Current rollout
              </h2>
            </div>
            <Link
              href="/localities"
              className="text-sm font-semibold text-moss hover:text-moss/80"
            >
              Browse all localities
            </Link>
          </div>

          <div className="mt-6 grid gap-5">
            {municipalities.map((municipality) => (
              <article
                key={municipality.slug}
                className="rounded-[1.75rem] border border-ink/10 bg-sand/40 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
                      Launching locality
                    </p>
                    <h3 className="text-balance font-serif text-3xl leading-tight text-moss">
                      {municipality.shortName}
                    </h3>
                    <p className="text-pretty text-base leading-7 text-ink/75">
                      {municipality.about}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 lg:max-w-[18rem] lg:justify-end">
                    <Link
                      href="/localities"
                      className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
                    >
                      Open locality selector
                    </Link>
                    <Link
                      href={`/${municipality.slug}/source-inventory`}
                      className="rounded-full border border-moss/15 bg-white px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
                    >
                      View sources
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            For residents
          </p>
          <h2 className="text-balance mt-3 font-serif text-3xl leading-tight text-moss">
            Easy to scan
          </h2>
          <p className="text-pretty mt-3 text-base leading-7 text-ink/75">
            The goal is to make meetings, notices, and township updates easier
            to follow without making people hunt through multiple sections of an
            official site.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Source-linked
          </p>
          <h2 className="text-balance mt-3 font-serif text-3xl leading-tight text-moss">
            Read the original
          </h2>
          <p className="text-pretty mt-3 text-base leading-7 text-ink/75">
            Every public entry points back to the underlying source material so
            readers can check the original notice, agenda, post, or document
            themselves.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Growing platform
          </p>
          <h2 className="text-balance mt-3 font-serif text-3xl leading-tight text-moss">
            One locality at a time
          </h2>
          <p className="text-pretty mt-3 text-base leading-7 text-ink/75">
            Manheim Township is the first launch. More locality pages can be
            added over time without turning the homepage into a specific
            township site.
          </p>
        </div>
      </section>
    </div>
  );
}
