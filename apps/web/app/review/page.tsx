import Link from "next/link";

import { getReviewData } from "../../lib/data";

export default async function ReviewPage() {
  const entries = await getReviewData("manheimtownshippa");

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Platform admin path</p>
            <h1 className="mt-3 font-serif text-4xl text-moss">Review queue</h1>
          </div>
          <Link
            href="/manheimtownshippa"
            className="rounded-full border border-moss/15 bg-sky/50 px-4 py-2 text-sm font-semibold text-moss"
          >
            Current queue: Manheim Township
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/75">
          This queue is for unofficial-source items. During the MVP it only shows the Manheim Township
          launch locality.
        </p>

        <div className="mt-8 space-y-4">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <article key={entry.id} className="rounded-[1.5rem] border border-ink/10 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-2xl text-moss">{entry.title}</h2>
                  <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                    {entry.category.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-base leading-7 text-ink/75">{entry.summary}</p>
                <p className="mt-3 text-sm text-ink/60">Reason: {entry.reason}</p>
                <a href={entry.sourceUrl} className="mt-4 inline-flex text-sm font-semibold text-moss">
                  Open source
                </a>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-ink/15 p-6 text-ink/70">
              No review-required entries are stored yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
