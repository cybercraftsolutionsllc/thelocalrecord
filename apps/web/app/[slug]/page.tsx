import { notFound } from "next/navigation";
import Link from "next/link";

import { LocalityAskBox } from "../../components/locality-ask-box";
import { LocalityMeetingIntelligence } from "../../components/locality-meeting-intelligence";
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
      <section className="relative overflow-hidden rounded-xl border border-ink/10 bg-ink text-white shadow-card">
        <img
          src="/images/manheim-hero.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-32"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/88 to-ink/52" />
        <div className="relative p-5 sm:p-7">
          <p className="text-sm font-semibold text-sky">
            {data.municipality.name}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-none text-white sm:text-6xl">
            Your resident record for what is changing nearby.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/74">
            Search roads, ordinances, projects, parks, meetings, permits, and
            official updates. Every important claim points back to a public
            source.
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Tracked sources" value={activeSources.length} dark />
            <Stat label="Coverage lanes" value={sourceCategories.size} dark />
            <Stat
              label="Status"
              value={activeSources.length > 0 ? "Live" : "Planned"}
              dark
            />
          </div>

          <div className="mt-6">
            <LocalitySubnav slug={slug} currentSuffix="" tone="dark" />
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <LivePublishedEntries
          slug={slug}
          initialEntries={data.entries}
          trackedSources={activeSources.map((source) => ({
            name: source.name,
            publicCategory: source.publicCategory,
            url: source.url
          }))}
        />
      </section>

      <LocalityMeetingIntelligence slug={slug} />

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

function Stat({
  label,
  value,
  dark = false
}: {
  label: string;
  value: string | number;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-t px-0 py-3 text-sm sm:border-t-0 ${
        dark ? "border-white/16" : "border-ink/8 px-4"
      }`}
    >
      <p className={`font-semibold ${dark ? "text-white/58" : "text-ink/58"}`}>
        {label}
      </p>
      <p
        className={`font-serif text-2xl leading-none ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
