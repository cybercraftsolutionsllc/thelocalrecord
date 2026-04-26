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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">
          {data.municipality.shortName} review queue
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink">
          Unofficial-source review
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">
          Official township and government sources publish automatically. This
          queue is reserved for unofficial-source items that still need human
          review.
        </p>
        <div className="mt-6">
          <LocalitySubnav slug={slug} currentSuffix="/review" />
        </div>
      </section>

      <section className="space-y-4">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-lg border border-ink/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-2xl text-ink">{entry.title}</h2>
                <span className="rounded-md bg-clay/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                  {entry.category.split("_").join(" ")}
                </span>
              </div>
              <p className="mt-3 text-base leading-7 text-ink/70">
                {entry.summary}
              </p>
              <p className="mt-3 text-sm text-ink/60">Reason: {entry.reason}</p>
              <a
                href={entry.sourceUrl}
                className="mt-4 inline-flex text-sm font-semibold text-moss"
              >
                Open source
              </a>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-ink/15 bg-white p-6 text-ink/70">
            No unofficial-source items are waiting for review.
          </div>
        )}
      </section>
    </div>
  );
}
