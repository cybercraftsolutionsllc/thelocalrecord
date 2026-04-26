import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();
  const launchLocality = municipalities[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">Resident lookup</p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-none text-ink sm:text-6xl">
          What affects this place?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/68">
          Search local records by address, street, project, road, park, or
          meeting. Open the official source before you act.
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
              placeholder="Address, street, project, road..."
              className="h-12 w-full rounded-lg border border-ink/15 bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink/38 focus:border-moss"
            />
          </label>
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-moss px-5 text-sm font-semibold text-white transition hover:bg-ink sm:w-auto"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {["Ashford Meadows", "Route 30", "Planning Commission"].map(
            (query) => (
              <Link
                key={query}
                href={`/${launchLocality.slug}?q=${encodeURIComponent(query)}#records`}
                className="rounded-md border border-ink/10 bg-white px-3 py-2 text-ink/70 transition hover:border-moss/25 hover:text-moss"
              >
                {query}
              </Link>
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <p className="text-sm font-semibold text-moss">First coverage area</p>
        <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">
          {launchLocality.shortName}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/62">
          Manheim is the model locality for the resident record workflow.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/${launchLocality.slug}`}
            className="rounded-md bg-moss px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-ink"
          >
            Open Manheim
          </Link>
          <Link
            href="/my-record"
            className="rounded-md border border-ink/10 px-4 py-3 text-center text-sm font-semibold text-moss transition hover:bg-sky/45"
          >
            Save My Place
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
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
              <h2 className="font-serif text-2xl text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/62">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <p className="text-sm font-semibold text-moss">Source trail</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl text-ink">
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
