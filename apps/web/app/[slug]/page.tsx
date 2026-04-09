import { notFound } from "next/navigation";

import { UpdateCard } from "../../components/update-card";
import { getLocalityData } from "../../lib/data";

type LocalityPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LocalityPage({ params }: LocalityPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
      <section className="grid gap-6 rounded-[2rem] bg-white px-8 py-10 shadow-card lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full bg-sky px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-moss">
            Locality digest
          </span>
          <div className="space-y-3">
            <h1 className="font-serif text-5xl text-moss">{data.municipality.shortName}</h1>
            <p className="max-w-3xl text-lg leading-8 text-ink/75">{data.municipality.about}</p>
          </div>
          <div className="rounded-[1.5rem] border border-clay/20 bg-clay/5 px-5 py-4 text-sm leading-7 text-ink/75">
            This digest is independent and resident-run. It links back to township sources, but it is not
            affiliated with or speaking for Manheim Township.
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-sand p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">About this digest</p>
          <ul className="mt-4 space-y-4 text-sm leading-7 text-ink/75">
            <li>Low-risk items may publish automatically after diffing and classification.</li>
            <li>Higher-risk planning, legal, or low-confidence items stay out of public publication.</li>
            <li>Every public entry links to underlying sources.</li>
            <li>Corrections can be reported from the site footer and corrections page.</li>
          </ul>
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

          {data.entries.length > 0 ? (
            <div className="space-y-5">
              {data.entries.map((entry) => (
                <UpdateCard key={entry.id} {...entry} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-ink/15 bg-white p-8 text-ink/70 shadow-card">
              <h3 className="font-serif text-2xl text-moss">No published entries yet</h3>
              <p className="mt-3 max-w-2xl leading-7">
                The source registry is ready and the page is live. Run the ingestion workflow locally or in GitHub
                Actions to populate the first set of source-linked updates.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Source categories</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {data.municipality.sources.map((source) => (
                <span
                  key={source.slug}
                  className="rounded-full border border-moss/10 bg-sky/60 px-3 py-2 text-sm text-moss"
                >
                  {source.publicCategory}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Transparency notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
              <li>Fetches are hashed for auditability.</li>
              <li>Unchanged items do not generate duplicate public posts.</li>
              <li>Low-confidence extraction is surfaced instead of hidden.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
