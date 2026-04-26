import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-lg bg-white p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            About the project
          </p>
          <h1 className="font-serif text-4xl text-moss">
            Why The Local Record exists
          </h1>
          <p className="max-w-3xl text-base leading-8 text-ink/75">
            The Local Record is an independent digest for people who want an
            easier way to follow local government activity without wading
            through scattered pages, notices, and attachments.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Independence
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              This is not an official government website and does not speak for
              any municipality.
            </p>
          </div>
          <div className="rounded-lg border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Source trail
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              Public entries point back to the original notice, agenda, post, or
              document.
            </p>
          </div>
          <div className="rounded-lg border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Locality-first
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              Each locality keeps its own digest, source inventory, and
              correction trail.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="space-y-4 text-base leading-8 text-ink/75">
            <h2 className="font-serif text-2xl text-moss">What it does</h2>
            <p>
              Tracks selected public municipal sources per locality instead of
              trying to mirror an official site.
            </p>
            <p>
              Groups updates into clearer resident-facing categories like
              meetings, news, alerts, and planning items.
            </p>
            <p>
              Links every public entry back to the original source material.
            </p>
          </section>

          <section className="space-y-4 text-base leading-8 text-ink/75">
            <h2 className="font-serif text-2xl text-moss">How it works</h2>
            <p>
              Sources are registered per municipality and checked for changes.
            </p>
            <p>
              New or updated items are normalized into a standard format so they
              can be sorted, filtered, and published consistently.
            </p>
            <p>
              Official-source items publish with source links, and corrections
              stay tied to the source trail.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/localities"
            className="rounded-md bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
          >
            Browse localities
          </Link>
          <Link
            href="/policy"
            className="rounded-md border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
          >
            Read the policy
          </Link>
        </div>
      </div>
    </div>
  );
}
