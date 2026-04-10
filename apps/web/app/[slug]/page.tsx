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
      <section className="overflow-hidden rounded-[2.5rem] bg-moss text-white shadow-card">
        <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-10 lg:py-11">
          <div className="flex h-full flex-col">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Locality digest
            </span>
            <div className="mt-5 space-y-4">
              <h1 className="text-balance max-w-4xl font-serif text-4xl leading-[1.04] text-sand sm:text-5xl lg:text-[3.8rem]">
                {data.municipality.shortName}
              </h1>
              <p className="text-pretty max-w-3xl text-lg leading-8 text-white/82">
                Clear local updates, the most useful source links, and enough
                context to understand what changed without digging through five
                township pages first.
              </p>
            </div>
            <div className="mt-8 max-w-3xl rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-4 text-sm leading-7 text-white/82">
              This digest is independent and resident-run. It links back to
              township sources, but it is not affiliated with or speaking for
              Manheim Township.
            </div>
          </div>

          <div className="flex h-full flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
                What this page is for
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
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
            <div className="pt-1">
              <LocalitySubnav slug={slug} currentSuffix="" tone="dark" />
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
