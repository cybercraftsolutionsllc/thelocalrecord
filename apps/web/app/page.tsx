import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-14">
      <section className="overflow-hidden rounded-[2.5rem] bg-moss text-white shadow-card">
        <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Platform home
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-serif text-5xl leading-tight text-sand lg:text-6xl">
                Clear local updates, available in one place and linked back to the source.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/80">
                The Local Record makes public municipal information easier to follow with readable
                locality pages, direct source links, and a clear independence disclaimer.
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

          <div className="grid gap-4 self-start rounded-[2rem] bg-white/10 p-5 backdrop-blur-sm">
            <div className="rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">What the platform does</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                <li>Puts important local updates in one readable place.</li>
                <li>Helps residents scan meetings, notices, and planning items faster.</li>
                <li>Links every entry back to the original source.</li>
              </ul>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">What this is not</p>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Not an official township website, not a proxy for public notices, and not a place for
                unsupported interpretation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Why it exists</p>
          <h2 className="mt-3 font-serif text-4xl text-moss">A simpler way to keep up</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/75">
            Township websites often spread important information across calendars, news posts, agendas,
            minutes, and department pages. The Local Record pulls that into a clearer digest without
            pretending to be the township itself.
          </p>
          <div className="mt-6">
            <Link href="/about" className="text-sm font-semibold text-moss">
              Read more about the project
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-ink/10 bg-white p-8 shadow-card">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Live localities</p>
              <h2 className="mt-2 font-serif text-4xl text-moss">Current rollout</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            {municipalities.map((municipality) => (
              <article
                key={municipality.slug}
                className="grid gap-5 rounded-[1.75rem] border border-ink/10 bg-sand/40 p-6 lg:grid-cols-[1fr_auto]"
              >
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Launching locality</p>
                  <h3 className="font-serif text-3xl text-moss">{municipality.shortName}</h3>
                  <p className="max-w-2xl text-base leading-7 text-ink/75">{municipality.about}</p>
                </div>
                <div className="flex items-start">
                  <Link
                    href="/localities"
                    className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
                  >
                    Open locality selector
                  </Link>
                  <Link
                    href={`/${municipality.slug}/source-inventory`}
                    className="rounded-full border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
                  >
                    View sources
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">For residents</p>
          <h2 className="mt-3 font-serif text-3xl text-moss">Easy to scan</h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            The goal is to make meetings, notices, and township updates easier to follow without making
            people hunt through multiple sections of an official site.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Source-linked</p>
          <h2 className="mt-3 font-serif text-3xl text-moss">Read the original</h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            Every public entry points back to the underlying source material so readers can check the
            original notice, agenda, post, or document themselves.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Growing platform</p>
          <h2 className="mt-3 font-serif text-3xl text-moss">One locality at a time</h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            Manheim Township is the first launch. More locality pages can be added over time without
            turning the homepage into a specific township site.
          </p>
        </div>
      </section>
    </div>
  );
}
