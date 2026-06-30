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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 lg:py-10">
      <section className="rounded-2xl border border-ink/10 bg-white/92 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-moss">
              {data.municipality.name}
            </p>
            <h1 className="mt-2 max-w-4xl font-serif text-3xl leading-tight text-ink sm:text-5xl">
              One calm place to find what local records say.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/64 sm:text-base sm:leading-7">
              Search official posts, notices, agendas, minutes, projects, and
              public documents without learning the municipal website first.
            </p>
          </div>

          <div className="hidden grid-cols-3 gap-2 text-sm sm:grid lg:min-w-[390px]">
            <Stat label="Sources" value={activeSources.length} />
            <Stat label="Lanes" value={sourceCategories.size} />
            <Stat
              label="Status"
              value={activeSources.length > 0 ? "Live" : "Planned"}
            />
          </div>
        </div>

        <div className="mt-4 hidden border-t border-ink/8 pt-3 sm:mt-5 sm:block sm:pt-4">
          <LocalitySubnav slug={slug} currentSuffix="" />
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

      <LocalityAskBox slug={slug} />

      <LocalityNewsletterBox
        slug={slug}
        municipalityName={data.municipality.shortName}
      />

      <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card sm:p-6">
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
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-ink/8 bg-sand/70 px-3 py-2 sm:px-4 sm:py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl leading-none text-ink sm:mt-2">
        {value}
      </p>
    </div>
  );
}
