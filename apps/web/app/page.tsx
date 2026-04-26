import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();
  const launchLocality = municipalities[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:gap-10 lg:py-10">
      <section
        className="relative overflow-hidden rounded-[1.25rem] bg-[#183f47] text-white shadow-card"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 38, 45, 0.96) 0%, rgba(16, 58, 67, 0.88) 46%, rgba(16, 58, 67, 0.36) 100%), url('/images/manheim-hero.png')",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="grid min-h-[560px] gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_0.86fr] lg:px-9 lg:py-9">
          <div className="flex max-w-3xl flex-col justify-between">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#aee4ef]">
                Local records for residents
              </span>
              <div className="space-y-4">
                <h1 className="font-serif text-5xl leading-[0.94] text-white sm:text-6xl lg:text-[5.5rem]">
                  The Local Record
                </h1>
                <p className="max-w-2xl text-pretty text-lg leading-8 text-white/82">
                  Check what township records say about a property, street,
                  project, road closure, meeting, park, or local decision.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
              <div className="border-t border-white/22 pt-4">
                <p className="font-semibold text-[#f5c76b]">Search first</p>
                <p className="mt-2 leading-6 text-white/68">
                  Address, street, project, road, park
                </p>
              </div>
              <div className="border-t border-white/22 pt-4">
                <p className="font-semibold text-[#f5c76b]">Source linked</p>
                <p className="mt-2 leading-6 text-white/68">
                  Agendas, notices, minutes, township posts
                </p>
              </div>
              <div className="border-t border-white/22 pt-4">
                <p className="font-semibold text-[#f5c76b]">Built for phones</p>
                <p className="mt-2 leading-6 text-white/68">
                  Scan, verify, subscribe, share
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <div className="w-full rounded-[1.25rem] border border-white/14 bg-white p-5 text-ink shadow-card sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
                Check your local record
              </p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-moss">
                What is happening near this property?
              </h2>
              <form
                action={`/${launchLocality.slug}`}
                method="get"
                className="mt-5 space-y-3"
              >
                <label className="block">
                  <span className="sr-only">
                    Address, street, project, road, park, or meeting
                  </span>
                  <input
                    name="q"
                    type="search"
                    minLength={3}
                    required
                    placeholder="Try Ashford Meadows, Route 30, Granite Run..."
                    className="w-full rounded-[1rem] border border-ink/10 bg-sand/35 px-4 py-4 text-base text-ink outline-none transition placeholder:text-ink/42 focus:border-[#183f47]/40 focus:bg-white"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-[0.9rem] bg-[#183f47] px-5 py-3 text-sm font-bold text-white transition hover:bg-moss"
                >
                  Run local scan
                </button>
              </form>
              <Link
                href="/my-record"
                className="mt-3 block rounded-[0.9rem] border border-moss/15 bg-sand/45 px-5 py-3 text-center text-sm font-bold text-moss transition hover:bg-sky/55"
              >
                Save my place and watchlists
              </Link>

              <div className="mt-5 grid gap-2">
                {[
                  ["Development", "Ashford Meadows"],
                  ["Traffic", "Route 30"],
                  ["Meetings", "Planning Commission"]
                ].map(([label, query]) => (
                  <Link
                    key={query}
                    href={`/${launchLocality.slug}?q=${encodeURIComponent(query)}#records`}
                    className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-ink/8 bg-[#f8f6ef] px-3 py-3 text-sm transition hover:border-moss/20 hover:bg-sky/50"
                  >
                    <span className="font-semibold text-moss">{label}</span>
                    <span className="text-ink/58">{query}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "For your property",
            body: "Use an address, street, intersection, or development name to find matching local records."
          },
          {
            title: "For your week",
            body: "See meetings, dates, closures, notices, and items residents can act on next."
          },
          {
            title: "For the source",
            body: "Every result points back to the official record so you can verify before deciding."
          }
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-[1.25rem] border border-white/75 bg-white p-6 shadow-card"
          >
            <h2 className="font-serif text-3xl leading-tight text-moss">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink/68">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 rounded-[1.25rem] border border-white/75 bg-white p-6 shadow-card lg:grid-cols-[1fr_0.8fr] lg:items-center lg:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Live locality
          </p>
          <h2 className="mt-2 font-serif text-4xl leading-tight text-moss">
            {launchLocality.shortName} is the first full resident console.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/72">
            The page is organized around one useful habit: check the local
            record, understand what changed, open the source, and know what to
            watch next.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href={`/${launchLocality.slug}`}
            className="rounded-[0.9rem] bg-moss px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#183f47]"
          >
            Open resident console
          </Link>
          <Link
            href="/my-record"
            className="rounded-[0.9rem] border border-moss/15 bg-[#183f47] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-moss"
          >
            Open My Record
          </Link>
          <Link
            href={`/${launchLocality.slug}/source-inventory`}
            className="rounded-[0.9rem] border border-moss/15 bg-sand/35 px-5 py-3 text-center text-sm font-semibold text-moss transition hover:bg-sky/55"
          >
            See tracked sources
          </Link>
        </div>
      </section>
    </div>
  );
}
