import Link from "next/link";

import { municipalities } from "@thelocalrecord/core";

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-lg bg-white p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Platform admin path
          </p>
          <h1 className="mt-3 font-serif text-4xl text-moss">
            Review queues by locality
          </h1>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/75">
          Official township and government sources publish automatically. Each
          locality keeps its own review queue for unofficial-source items.
        </p>

        <div className="mt-8 space-y-4">
          {municipalities.map((municipality) => (
            <article
              key={municipality.slug}
              className="rounded-lg border border-ink/10 p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
                Locality
              </p>
              <h2 className="mt-2 font-serif text-3xl text-moss">
                {municipality.shortName}
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75">
                Open the locality review page to inspect unofficial-source items
                for this digest.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/${municipality.slug}`}
                  className="rounded-md border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
                >
                  Open digest
                </Link>
                <Link
                  href={`/${municipality.slug}/review`}
                  className="rounded-md bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
                >
                  Open review queue
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
