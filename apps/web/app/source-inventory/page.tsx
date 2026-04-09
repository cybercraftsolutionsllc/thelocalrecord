import Link from "next/link";

import { municipalities } from "@thelocalrecord/core";

export default function SourceInventoryPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-6 rounded-[2rem] bg-white p-8 shadow-card">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Platform transparency</p>
          <h1 className="mt-3 font-serif text-4xl text-moss">Source inventory</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/75">
            Source inventories now live underneath each municipality so every locality keeps its own source
            trail. Start with a locality below to view the exact pages, feeds, and categories tracked for
            that digest.
          </p>
        </div>

        <div className="grid gap-4">
          {municipalities.map((municipality) => (
            <article key={municipality.slug} className="rounded-[1.5rem] border border-ink/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Municipality</p>
              <h2 className="mt-2 font-serif text-3xl text-moss">{municipality.shortName}</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75">{municipality.about}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/${municipality.slug}`}
                  className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
                >
                  Open digest
                </Link>
                <Link
                  href={`/${municipality.slug}/source-inventory`}
                  className="rounded-full border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
                >
                  View source inventory
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
