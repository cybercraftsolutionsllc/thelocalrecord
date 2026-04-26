import Link from "next/link";
import type { ReactNode } from "react";

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">About the project</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">
          Why The Local Record exists
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">
          The Local Record is an independent digest for people who want an
          easier way to follow local government activity without wading through
          scattered pages, notices, and attachments.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="divide-y divide-ink/8">
          <Principle title="Independence">
            This is not an official government website and does not speak for
            any municipality.
          </Principle>
          <Principle title="Source trail">
            Public entries point back to the original notice, agenda, post, or
            document.
          </Principle>
          <Principle title="Locality-first">
            Each locality keeps its own digest, source inventory, and correction
            trail.
          </Principle>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="space-y-7 text-base leading-8 text-ink/70">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl text-ink">What it does</h2>
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

          <section className="space-y-3 border-t border-ink/8 pt-7">
            <h2 className="font-serif text-2xl text-ink">How it works</h2>
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
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/localities"
          className="rounded-md bg-moss px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-moss/90"
        >
          Browse localities
        </Link>
        <Link
          href="/policy"
          className="rounded-md border border-moss/15 px-5 py-3 text-center text-sm font-semibold text-moss transition hover:bg-sky/40"
        >
          Read the policy
        </Link>
      </div>
    </div>
  );
}

function Principle({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <p className="text-sm font-semibold text-moss">{title}</p>
      <p className="mt-2 text-sm leading-7 text-ink/70">{children}</p>
    </div>
  );
}
