import { notFound } from "next/navigation";
import Link from "next/link";

import { CommunityAtlas } from "../../components/community-atlas";
import { LocalityAskBox } from "../../components/locality-ask-box";
import { LocalityNewsletterBox } from "../../components/locality-newsletter-box";
import { LocalitySubnav } from "../../components/locality-subnav";
import { LivePublishedEntries } from "../../components/live-published-entries";
import { getLocalityData } from "../../lib/data";

type LocalityPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: "manheimtownshippa" }];
}

export default async function LocalityPage({ params }: LocalityPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  const activeSources = data.municipality.sources.filter(
    (source) => source.implemented
  );
  const sourceCategories = new Set(
    activeSources.map((source) => source.publicCategory)
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:gap-10 lg:py-10">
      <section className="overflow-hidden rounded-[1.25rem] bg-[#183f47] text-white shadow-card">
        <div className="grid gap-7 px-5 py-6 sm:px-7 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-9 lg:py-9">
          <div className="flex h-full flex-col">
            <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#aee4ef]">
              Manheim Township local record
            </span>
            <div className="mt-5 space-y-4">
              <h1 className="text-balance max-w-4xl font-serif text-4xl leading-[1.02] text-white sm:text-5xl lg:text-[4.2rem]">
                Check what affects your property, street, and neighborhood.
              </h1>
              <p className="text-pretty max-w-3xl text-lg leading-8 text-white/82">
                Search local records for {data.municipality.shortName}: roads,
                planning items, permits, public notices, meetings, parks, and
                official source documents.
              </p>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#records"
                className="rounded-[0.9rem] bg-[#f5c76b] px-5 py-3 text-center text-sm font-bold text-[#173238] transition hover:bg-white"
              >
                Check my area
              </Link>
              <Link
                href={`/${slug}?q=Ashford%20Meadows#records`}
                className="rounded-[0.9rem] border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/16"
              >
                Try Ashford Meadows
              </Link>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between gap-5 rounded-[1.1rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[0.85rem] border border-white/10 bg-white/10 px-3 py-3">
                <p className="font-serif text-3xl leading-none text-sand">
                  {activeSources.length}
                </p>
                <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sky">
                  Sources
                </p>
              </div>
              <div className="rounded-[0.85rem] border border-white/10 bg-white/10 px-3 py-3">
                <p className="font-serif text-3xl leading-none text-sand">
                  {sourceCategories.size}
                </p>
                <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sky">
                  Lanes
                </p>
              </div>
              <div className="rounded-[0.85rem] border border-white/10 bg-white/10 px-3 py-3">
                <p className="font-serif text-3xl leading-none text-sand">
                  Live
                </p>
                <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sky">
                  Feed
                </p>
              </div>
            </div>

            <div className="rounded-[1rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
                Built for resident questions
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                <li>
                  Does a record mention my address, street, route, or project?
                </li>
                <li>
                  What is next, and which official source verifies it?
                </li>
                <li>
                  What should I watch before a meeting, closure, or decision?
                </li>
              </ul>
            </div>
            <div className="pt-1">
              <LocalitySubnav slug={slug} currentSuffix="" tone="dark" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.34fr_0.66fr] lg:items-start">
        <div className="min-w-0">
          <LivePublishedEntries slug={slug} initialEntries={data.entries} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <LocalityNewsletterBox
            slug={slug}
            municipalityName={data.municipality.shortName}
          />

          <section className="rounded-[1.5rem] border border-white/75 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              Need to act?
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              These are the next useful paths after reading a record.
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href={`/${slug}/source-inventory`}
                className="rounded-[1rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Trace official source coverage
              </Link>
              <Link
                href={`/${slug}/corrections`}
                className="rounded-[1rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Report a wrong or missing detail
              </Link>
              <Link
                href="/policy"
                className="rounded-[1rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Check editorial rules
              </Link>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-white/75 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              What to expect
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
              <li>
                Events of note are meant to be quick to scan, not a substitute
                for the source.
              </li>
              <li>
                Use search for projects, addresses, ordinances, or development
                names that may span multiple records.
              </li>
              <li>
                If a question matters legally or financially, open the cited
                source before acting.
              </li>
            </ul>
          </section>

          <LocalityAskBox slug={slug} />
        </aside>
      </section>

      <CommunityAtlas slug={slug} />
    </div>
  );
}
