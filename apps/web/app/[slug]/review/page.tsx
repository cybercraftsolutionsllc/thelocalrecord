import { notFound } from "next/navigation";

import { LocalitySubnav } from "../../../components/locality-subnav";
import { getLocalityData, getReviewData } from "../../../lib/data";

type LocalityReviewPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: "manheimtownshippa" }];
}

export default async function LocalityReviewPage({
  params
}: LocalityReviewPageProps) {
  const { slug } = await params;
  const [data, entries] = await Promise.all([
    getLocalityData(slug),
    getReviewData(slug)
  ]);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            {data.municipality.shortName} review queue
          </p>
          <div className="space-y-3">
            <h1 className="font-serif text-4xl text-moss">
              Unofficial-source review
            </h1>
            <p className="max-w-3xl text-base leading-8 text-ink/75">
              Official township and government sources publish automatically.
              This queue is reserved for unofficial-source items that still need
              human review.
            </p>
          </div>
          <LocalitySubnav slug={slug} currentSuffix="/review" />
        </div>

        <div className="mt-8 space-y-4">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[1.5rem] border border-ink/10 p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-2xl text-moss">
                    {entry.title}
                  </h2>
                  <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                    {entry.category.split("_").join(" ")}
                  </span>
                </div>
                <p className="mt-3 text-base leading-7 text-ink/75">
                  {entry.summary}
                </p>
                <p className="mt-3 text-sm text-ink/60">
                  Reason: {entry.reason}
                </p>
                <a
                  href={entry.sourceUrl}
                  className="mt-4 inline-flex text-sm font-semibold text-moss"
                >
                  Open source
                </a>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-ink/15 p-6 text-ink/70">
              No unofficial-source items are waiting for review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
