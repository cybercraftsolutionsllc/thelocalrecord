import { notFound } from "next/navigation";
import { municipalities } from "@thelocalrecord/core";

import { LocalitySubnav } from "../../../components/locality-subnav";
import { getLocalityData } from "../../../lib/data";

type LocalitySourceInventoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return municipalities.map((municipality) => ({ slug: municipality.slug }));
}

export default async function LocalitySourceInventoryPage({
  params
}: LocalitySourceInventoryPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  const activeSources = data.municipality.sources.filter(
    (source) => source.implemented
  );
  const plannedSources = data.municipality.sources.filter(
    (source) => !source.implemented
  );
  const categoryCounts = activeSources.reduce<
    Array<{ label: string; count: number }>
  >((counts, source) => {
    const existing = counts.find(
      (item) => item.label === source.publicCategory
    );

    if (existing) {
      existing.count += 1;
    } else {
      counts.push({ label: source.publicCategory, count: 1 });
    }

    return counts;
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">
          {data.municipality.shortName} source inventory
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink">
          Tracked source pages for this digest
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">
          These are the official pages and feeds this locality digest is
          designed to watch. The inventory is separated per municipality so
          future township pages can keep their own source trail.
        </p>
        <div className="mt-6">
          <LocalitySubnav slug={slug} currentSuffix="/source-inventory" />
        </div>
      </section>

      <section className="divide-y divide-ink/8 rounded-lg border border-ink/10 bg-white">
        <Metric label="Active sources" value={activeSources.length} />
        <Metric label="Planned sources" value={plannedSources.length} />
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-moss">Coverage model</p>
          <p className="mt-2 text-sm leading-7 text-ink/70">
            Official township pages, feeds, agendas, minutes, and archives.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <p className="text-sm font-semibold text-moss">Coverage lanes</p>
        <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">
          What this source set can answer
        </h2>
        <p className="mt-3 text-sm leading-7 text-ink/70">
          The digest is strongest when a resident searches for a project,
          meeting, ordinance, public notice, park item, road impact, or planning
          document and then opens the original source trail.
        </p>
        <div className="mt-5 divide-y divide-ink/8">
          {categoryCounts.map((category) => (
            <div key={category.label} className="py-4 first:pt-0 last:pb-0">
              <p className="font-semibold text-moss">{category.label}</p>
              <p className="mt-2 text-sm leading-6 text-ink/62">
                {category.count} active source
                {category.count === 1 ? "" : "s"} feeding the locality record.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-moss">Active now</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Sources currently feeding this digest
          </h2>
        </div>
        {activeSources.map((source) => (
          <article
            key={source.slug}
            className="rounded-lg border border-ink/10 bg-white p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-serif text-2xl text-ink">{source.name}</h3>
              <span className="rounded-md bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                {source.publicCategory}
              </span>
              <span className="rounded-md bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                Active
              </span>
            </div>
            <p className="mt-3 text-base leading-7 text-ink/70">
              {source.description}
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-sm font-semibold text-moss"
            >
              Open official source
            </a>
          </article>
        ))}
      </section>

      {plannedSources.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-moss">Next up</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Sources planned for fuller locality coverage
            </h2>
          </div>
          {plannedSources.map((source) => (
            <article
              key={source.slug}
              className="rounded-lg border border-ink/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-serif text-2xl text-ink">{source.name}</h3>
                <span className="rounded-md bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  {source.publicCategory}
                </span>
                <span className="rounded-md bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                  Planned
                </span>
              </div>
              <p className="mt-3 text-base leading-7 text-ink/70">
                {source.description}
              </p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-moss"
              >
                Open official source
              </a>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <p className="text-sm font-semibold text-ink/58">{label}</p>
      <p className="font-serif text-2xl leading-none text-ink">{value}</p>
    </div>
  );
}
