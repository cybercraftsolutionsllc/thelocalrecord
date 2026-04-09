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

        <div className="grid gap-4">
          {data.municipality.sources.map((source) => (
            <article
              key={source.slug}
              className="rounded-[1.5rem] border border-ink/10 p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-2xl text-moss">{source.name}</h2>
                <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  {source.publicCategory}
                </span>
                <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                  {source.implemented ? "Active" : "Planned"}
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
      </div>
    </div>
  );
}
