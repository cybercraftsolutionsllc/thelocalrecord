import Link from "next/link";

import { getHomepageData } from "../lib/data";

export default function HomePage() {
  const { municipalities } = getHomepageData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-14">
      <section className="overflow-hidden rounded-[2.5rem] bg-moss text-white shadow-card">
        <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Platform home
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-serif text-5xl leading-tight text-sand lg:text-6xl">
                Follow local government updates without pretending to be local government.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/80">
                The Local Record is an independent platform for source-linked municipal digests.
                Locality pages live underneath it.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/manheimtownshippa"
                className="rounded-full bg-sand px-6 py-3 text-sm font-semibold text-moss transition hover:bg-white"
              >
                Open live Manheim Township page
              </Link>
              <Link
                href="/source-inventory"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse source inventory
              </Link>
            </div>
          </div>

          <div className="grid gap-4 self-start rounded-[2rem] bg-white/10 p-5 backdrop-blur-sm">
            <div className="rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">What the platform does</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                <li>Fetches public municipal sources on a schedule.</li>
                <li>Detects what changed and keeps source hashes.</li>
                <li>Auto-publishes official-source updates.</li>
                <li>Holds unofficial-source items for review.</li>
              </ul>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">What this is not</p>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Not an official township website, not a proxy for public notices, and not a place for
                unsupported interpretation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">How the product works</p>
          <div className="mt-6 space-y-5">
            {[
              "Sources are registered per municipality, not scraped blindly.",
              "Every item is normalized, hashed, and compared against prior fetches.",
              "Official-source items publish automatically with source links.",
              "Corrections stay visible and the source trail remains intact."
            ].map((line, index) => (
              <div key={line} className="flex gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky text-sm font-semibold text-moss">
                  {index + 1}
                </div>
                <p className="pt-1 text-base leading-7 text-ink/75">{line}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-ink/10 bg-white p-8 shadow-card">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Live localities</p>
              <h2 className="mt-2 font-serif text-4xl text-moss">Current rollout</h2>
            </div>
            <Link href="/review" className="text-sm font-semibold text-moss">
              Review queue
            </Link>
          </div>

          <div className="mt-6 grid gap-5">
            {municipalities.map((municipality) => (
              <article
                key={municipality.slug}
                className="grid gap-5 rounded-[1.75rem] border border-ink/10 bg-sand/40 p-6 lg:grid-cols-[1fr_auto]"
              >
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Launching locality</p>
                  <h3 className="font-serif text-3xl text-moss">{municipality.shortName}</h3>
                  <p className="max-w-2xl text-base leading-7 text-ink/75">{municipality.about}</p>
                </div>
                <div className="flex items-start">
                  <Link
                    href={`/${municipality.slug}`}
                    className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
                  >
                    View digest
                  </Link>
                  <Link
                    href={`/${municipality.slug}/source-inventory`}
                    className="rounded-full border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
                  >
                    View sources
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Transparency</p>
          <h2 className="mt-3 font-serif text-3xl text-moss">Source first</h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            Each public entry is supposed to trace back to the original municipal record, with enough
            metadata to inspect what changed and when it was fetched.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Editorial posture</p>
          <h2 className="mt-3 font-serif text-3xl text-moss">Conservative by design</h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            Official sources publish automatically. Unofficial sources are where review begins.
          </p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Operations</p>
          <h2 className="mt-3 font-serif text-3xl text-moss">Multi-tenant foundation</h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            Manheim Township is the first launch. The architecture is already organized to support more
            municipalities under separate slugs as the source registry grows.
          </p>
        </div>
      </section>
    </div>
  );
}
