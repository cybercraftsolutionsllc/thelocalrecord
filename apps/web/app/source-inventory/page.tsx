import Link from "next/link";

import { municipalities } from "@thelocalrecord/core";

export default function SourceInventoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">Platform transparency</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">Source inventory</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">
          Source inventories now live underneath each municipality so every
          locality keeps its own source trail. Start with a locality below to
          view the exact pages, feeds, and categories tracked for that digest.
        </p>
      </section>

      {municipalities.map((municipality) => (
        <article
          key={municipality.slug}
          className="rounded-lg border border-ink/10 bg-white p-5"
        >
          <p className="text-sm font-semibold text-moss">Municipality</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            {municipality.shortName}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
            {municipality.about}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${municipality.slug}`}
              className="rounded-md bg-moss px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-moss/90"
            >
              Open digest
            </Link>
            <Link
              href={`/${municipality.slug}/source-inventory`}
              className="rounded-md border border-moss/15 px-5 py-3 text-center text-sm font-semibold text-moss transition hover:bg-sky/40"
            >
              View source inventory
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
