import { notFound } from "next/navigation";

import { LocalitySubnav } from "../../../components/locality-subnav";
import { getLocalityData } from "../../../lib/data";

type LocalitySourceInventoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: "manheimtownshippa" }];
}

export default async function LocalitySourceInventoryPage({
  params
}: LocalitySourceInventoryPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  const activeSources = data.municipality.sources.filter((source) => source.implemented);
  const plannedSources = data.municipality.sources.filter((source) => !source.implemented);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-8 rounded-[2rem] bg-white p-8 shadow-card">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            {data.municipality.shortName} source inventory
          </p>
          <div className="space-y-3">
            <h1 className="font-serif text-4xl text-moss">
              Tracked source pages for this digest
            </h1>
            <p className="max-w-3xl text-base leading-8 text-ink/75">
              These are the official pages and feeds this locality digest is
              designed to watch. The inventory is separated per municipality so
              future township pages can keep their own source trail.
            </p>
          </div>
          <LocalitySubnav slug={slug} currentSuffix="/source-inventory" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Active sources
            </p>
            <p className="mt-2 font-serif text-3xl text-moss">{activeSources.length}</p>
          </div>
          <div className="rounded-[1.5rem] border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Planned sources
            </p>
            <p className="mt-2 font-serif text-3xl text-moss">{plannedSources.length}</p>
          </div>
          <div className="rounded-[1.5rem] border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Coverage model
            </p>
            <p className="mt-2 text-sm leading-7 text-ink/75">
              Official township pages, feeds, agendas, minutes, and archives.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Active now
              </p>
              <h2 className="mt-2 font-serif text-3xl text-moss">
                Sources currently feeding this digest
              </h2>
            </div>
            <div className="grid gap-4">
              {activeSources.map((source) => (
                <article
                  key={source.slug}
                  className="rounded-[1.5rem] border border-ink/10 p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-serif text-2xl text-moss">{source.name}</h3>
                    <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                      {source.publicCategory}
                    </span>
                    <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                      Active
                    </span>
                  </div>
                  <p className="mt-3 text-base leading-7 text-ink/75">
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
            </div>
          </section>

          {plannedSources.length > 0 ? (
            <section className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                  Next up
                </p>
                <h2 className="mt-2 font-serif text-3xl text-moss">
                  Sources planned for fuller locality coverage
                </h2>
              </div>
              <div className="grid gap-4">
                {plannedSources.map((source) => (
                  <article
                    key={source.slug}
                    className="rounded-[1.5rem] border border-ink/10 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-2xl text-moss">{source.name}</h3>
                      <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                        {source.publicCategory}
                      </span>
                      <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                        Planned
                      </span>
                    </div>
                    <p className="mt-3 text-base leading-7 text-ink/75">
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
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
