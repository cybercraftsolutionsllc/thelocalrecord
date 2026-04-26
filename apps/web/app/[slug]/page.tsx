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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
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

        <div className="mt-6 divide-y divide-ink/8 rounded-lg border border-ink/10 bg-white">
          <Stat label="Sources" value={activeSources.length} />
          <Stat label="Lanes" value={sourceCategories.size} />
          <Stat
            label="Status"
            value={activeSources.length > 0 ? "Live" : "Planned"}
          />
        </div>

        <div className="mt-6">
          <LocalitySubnav slug={slug} currentSuffix="" />
        </div>
      </section>

      <section className="min-w-0">
        <LivePublishedEntries slug={slug} initialEntries={data.entries} />
      </section>

      <LocalityNewsletterBox
        slug={slug}
        municipalityName={data.municipality.shortName}
      />

      <LocalityAskBox slug={slug} />

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <p className="text-sm font-semibold text-moss">Source trail</p>
        <div className="mt-4 divide-y divide-ink/8 text-sm">
          <Link
            href={`/${slug}/source-inventory`}
            className="block py-3 font-semibold text-ink/70 transition first:pt-0 last:pb-0 hover:text-moss"
          >
            Tracked sources
          </Link>
          <Link
            href={`/${slug}/corrections`}
            className="block py-3 font-semibold text-ink/70 transition first:pt-0 last:pb-0 hover:text-moss"
          >
            Fix a detail
          </Link>
          <Link
            href="/policy"
            className="block py-3 font-semibold text-ink/70 transition first:pt-0 last:pb-0 hover:text-moss"
          >
            Rules
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <p className="font-semibold text-ink/58">{label}</p>
      <p className="font-serif text-2xl leading-none text-ink">{value}</p>
    </div>
  );
}
