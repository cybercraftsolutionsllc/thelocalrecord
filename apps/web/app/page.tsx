import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();
  const launchLocality = municipalities[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-[#fdfdf9] shadow-card">
        <img
          src="/images/civic-map-hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center right" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(253,253,249,0.98) 0%, rgba(253,253,249,0.91) 48%, rgba(253,253,249,0.35) 100%)"
          }}
        />
        <div className="relative p-5 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold text-moss">Resident lookup</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-ink sm:text-6xl">
            Find the local record before it affects your street.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/66">
            Search streets, projects, roads, parks, ordinances, permits, and
            meetings. The useful parts are summarized, dated, and tied back to
            official sources.
          </p>

          <form
            action={`/${launchLocality.slug}`}
            method="get"
            className="mt-8 space-y-3"
          >
            <label className="block">
              <span className="sr-only">Search local records</span>
              <input
                name="q"
                type="search"
                minLength={3}
                required
                placeholder="Street, project, ordinance, road, park..."
                className="h-14 w-full rounded-xl border border-ink/10 bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink/38 focus:border-moss/35"
              />
            </label>
            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-ink px-6 text-sm font-semibold text-white transition hover:bg-moss sm:w-auto"
            >
              Search Manheim
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {[
              "Line painting",
              "Butter Road",
              "Ordinance 2026-11",
              "Planning Commission"
            ].map((query) => (
              <Link
                key={query}
                href={`/${launchLocality.slug}?q=${encodeURIComponent(query)}#records`}
                className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2 text-ink/68 transition hover:bg-sky/65 hover:text-ink"
              >
                {query}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <p className="text-sm font-semibold text-moss">First coverage area</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">
          {launchLocality.shortName}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/62">
          Manheim is the model locality for the resident record workflow.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/${launchLocality.slug}`}
            className="rounded-lg bg-ink px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-moss"
          >
            Open Manheim
          </Link>
          <Link
            href="/my-record"
            className="rounded-lg border border-ink/10 px-4 py-3 text-center text-sm font-semibold text-ink/72 transition hover:bg-sky/55 hover:text-ink"
          >
            Save My Place
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <p className="text-sm font-semibold text-moss">How it works</p>
        <div className="mt-4 divide-y divide-ink/8">
          {[
            [
              "Search the record",
              "Start with the place or topic you already know."
            ],
            ["Read the match", "Scan plain-language summaries and dates."],
            [
              "Open the source",
              "Verify every important claim at the original record."
            ]
          ].map(([title, body]) => (
            <div key={title} className="py-4 first:pt-0 last:pb-0">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/62">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <p className="text-sm font-semibold text-moss">Source trail</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">
          Built to answer one resident question at a time.
        </h2>
        <div className="mt-5 divide-y divide-ink/8 text-sm text-ink/68">
          {[
            "Road closure mentioned near my route",
            "Planning item tied to a development name",
            "Meeting record with the next official source"
          ].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{item}</span>
              <span className="font-semibold text-moss">Source-linked</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
