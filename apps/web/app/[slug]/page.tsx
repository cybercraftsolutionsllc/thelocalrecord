import { notFound } from "next/navigation";
import Link from "next/link";

import { LocalityAskBox } from "../../components/locality-ask-box";
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:gap-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/75 bg-[#faf7ef] px-7 py-8 shadow-card lg:px-8 lg:py-9">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-x-0 bottom-0 h-[32%] bg-cover opacity-[0.98]"
            style={{
              backgroundImage:
                "url('/images/manheim-hero.png'), url('/images/manheim-hero.svg')",
              backgroundPosition: "center 64%"
            }}
          />
          <div className="absolute inset-x-0 bottom-[28%] h-36 bg-gradient-to-b from-transparent via-[#faf7ef]/84 to-[#faf7ef]" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-white/70 bg-sky/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-moss shadow-sm">
              Locality digest
            </span>
            <div className="max-w-3xl rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-sm sm:p-6">
              <div className="space-y-3">
                <h1 className="text-balance font-serif text-4xl leading-[1.02] text-moss sm:text-5xl lg:text-[3.85rem]">
                  {data.municipality.shortName}
                </h1>
                <p className="text-pretty max-w-3xl text-lg leading-8 text-ink/82">
                  Clear local updates, the most useful source links, and enough
                  context to understand what changed without digging through
                  five township pages first.
                </p>
              </div>
            </div>
            <div className="max-w-3xl rounded-[1.5rem] border border-clay/20 bg-[#fbf8f2] px-5 py-4 text-sm leading-7 text-ink/82 shadow-sm">
              This digest is independent and resident-run. It links back to
              township sources, but it is not affiliated with or speaking for
              Manheim Township.
            </div>
            <div className="pt-1">
              <LocalitySubnav slug={slug} currentSuffix="" />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-white/85 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">
                What this page is for
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
                <li>
                  Track the newest local notices, meetings, and planning items.
                </li>
                <li>Open the original source when you want the full record.</li>
                <li>
                  Use the source inventory to see exactly what this digest
                  watches.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/75 bg-white px-5 py-4 shadow-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                  Latest updates
                </p>
                <h2 className="mt-2 font-serif text-3xl text-moss">
                  Published entries
                </h2>
                <p className="mt-2 text-sm leading-7 text-ink/68">
                  Browse the latest public updates first, then drill into the
                  original documents when you need the full record.
                </p>
              </div>
            </div>
          </div>

          <LivePublishedEntries slug={slug} initialEntries={data.entries} />
        </div>

        <aside className="space-y-6">
          <LocalityAskBox
            slug={slug}
            localityName={data.municipality.shortName}
          />

          <section className="rounded-[2rem] border border-white/75 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              Locality links
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href={`/${slug}/source-inventory`}
                className="rounded-[1.25rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Source inventory
              </Link>
              <Link
                href={`/${slug}/corrections`}
                className="rounded-[1.25rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Corrections and reporting
              </Link>
              <Link
                href="/policy"
                className="rounded-[1.25rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Platform policy
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/75 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              How to use this page
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
              <li>
                Published entries are meant to be quick to scan, not a
                substitute for the source.
              </li>
              <li>
                Use the filters to narrow to meetings, alerts, planning items,
                or township news.
              </li>
              <li>
                If a question matters legally or financially, open the cited
                source before acting.
              </li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
