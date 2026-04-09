import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-14">
      <section className="grid gap-8 rounded-[2rem] bg-white px-8 py-10 shadow-card lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <span className="inline-flex rounded-full bg-sky px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-moss">
            Citizen-run local government digest
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl font-serif text-5xl leading-tight text-moss">
              A source-linked local government digest that stays clearly independent.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-ink/75">
              thelocalrecord tracks selected public municipal sources, detects changes, and publishes
              restrained summaries with links back to the originals. It is not an official township
              website.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/manheimtownshippa"
              className="rounded-full bg-moss px-6 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
            >
              View Manheim Township digest
            </Link>
            <Link
              href="/source-inventory"
              className="rounded-full border border-ink/10 px-6 py-3 text-sm font-semibold text-ink/80 transition hover:border-moss hover:text-moss"
            >
              See source inventory
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-sand p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">MVP scope</p>
          <ul className="mt-4 space-y-4 text-sm leading-7 text-ink/75">
            <li>Fetches real municipal sources on a schedule.</li>
            <li>Hashes source responses and keeps an audit trail.</li>
            <li>Auto-publishes only low-risk items.</li>
            <li>Routes nuanced or uncertain items into review.</li>
            <li>Preserves source links, timestamps, and correction paths.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {municipalities.map((municipality) => (
          <article key={municipality.slug} className="rounded-[2rem] border border-ink/10 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Launching locality</p>
            <h2 className="mt-3 font-serif text-3xl text-moss">{municipality.shortName}</h2>
            <p className="mt-3 text-base leading-7 text-ink/75">{municipality.about}</p>
            <Link href={`/${municipality.slug}`} className="mt-6 inline-flex text-sm font-semibold text-moss">
              Open locality page
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
