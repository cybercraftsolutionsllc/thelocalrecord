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
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
      <section className="rounded-[2rem] bg-white px-8 py-10 shadow-card">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-5">
          <span className="inline-flex rounded-full bg-sky px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-moss">
            Locality digest
          </span>
          <div className="space-y-3">
            <h1 className="font-serif text-5xl text-moss">{data.municipality.shortName}</h1>
            <p className="max-w-3xl text-lg leading-8 text-ink/75">
              Clear local updates with source links, timelines, and room to dig into the original
              material when something matters.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-clay/20 bg-clay/5 px-5 py-4 text-sm leading-7 text-ink/75">
            This digest is independent and resident-run. It links back to township sources, but it is not
            affiliated with or speaking for Manheim Township.
          </div>
          <LocalitySubnav slug={slug} />
        </div>

          <div className="grid gap-4 lg:w-[22rem]">
            <div className="rounded-[1.5rem] bg-sand p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">What this page is for</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
                <li>Track the newest local notices, meetings, and planning items.</li>
                <li>Open the original source when you want the full record.</li>
                <li>Use the source inventory to see exactly what this digest watches.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Latest updates</p>
              <h2 className="mt-2 font-serif text-3xl text-moss">Published entries</h2>
            </div>
          </div>

          <LivePublishedEntries slug={slug} initialEntries={data.entries} />
        </div>

        <aside className="space-y-6">
          <LocalityAskBox slug={slug} localityName={data.municipality.shortName} />

          <section className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Locality links</p>
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

          <section className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">How to use this page</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
              <li>Published entries are meant to be quick to scan, not a substitute for the source.</li>
              <li>Use the filters to narrow to meetings, alerts, planning items, or township news.</li>
              <li>If a question matters legally or financially, open the cited source before acting.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
