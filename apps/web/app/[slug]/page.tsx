import { notFound } from "next/navigation";
import Link from "next/link";

import { LocalityAskBox } from "../../components/locality-ask-box";
import { LocalityNewsletterBox } from "../../components/locality-newsletter-box";
import { LocalitySubnav } from "../../components/locality-subnav";
import { LivePublishedEntries } from "../../components/live-published-entries";
import { getLocalityData } from "../../lib/data";
import { municipalities } from "@thelocalrecord/core";

type LocalityPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return municipalities.map((municipality) => ({ slug: municipality.slug }));
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-moss">
              {data.municipality.name}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-none text-ink sm:text-6xl">
              Check your local record.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/64">
              Search by property clue, street, project, route, park, or meeting.
              Results stay source-linked and resident-first.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
            <Stat label="Sources" value={activeSources.length} />
            <Stat label="Lanes" value={sourceCategories.size} />
            <Stat
              label="Status"
              value={activeSources.length > 0 ? "Live" : "Planned"}
            />
          </div>
        </div>

        <div className="mt-6">
          <LocalitySubnav slug={slug} currentSuffix="" />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="min-w-0">
          <LivePublishedEntries slug={slug} initialEntries={data.entries} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <LocalityNewsletterBox
            slug={slug}
            municipalityName={data.municipality.shortName}
          />

          <section className="rounded-lg border border-ink/10 bg-white p-5">
            <p className="text-sm font-semibold text-moss">Source trail</p>
            <div className="mt-4 grid gap-2 text-sm">
              <Link
                href={`/${slug}/source-inventory`}
                className="rounded-md border border-ink/10 px-3 py-2 text-ink/70 transition hover:border-moss/25 hover:text-moss"
              >
                Tracked sources
              </Link>
              <Link
                href={`/${slug}/corrections`}
                className="rounded-md border border-ink/10 px-3 py-2 text-ink/70 transition hover:border-moss/25 hover:text-moss"
              >
                Fix a detail
              </Link>
              <Link
                href="/policy"
                className="rounded-md border border-ink/10 px-3 py-2 text-ink/70 transition hover:border-moss/25 hover:text-moss"
              >
                Rules
              </Link>
            </div>
          </section>

          <LocalityAskBox slug={slug} />
        </aside>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white px-3 py-3">
      <p className="font-serif text-2xl leading-none text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/50">{label}</p>
    </div>
  );
}
