import Link from "next/link";

export default function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Platform editorial policy</p>
            <h1 className="mt-3 font-serif text-4xl text-moss">How the platform decides what can publish</h1>
          </div>
          <Link
            href="/manheimtownshippa"
            className="rounded-full border border-moss/15 bg-sky/50 px-4 py-2 text-sm font-semibold text-moss"
          >
            Current live locality
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink/75">
          These rules apply across the platform. Manheim Township is the current launch locality, but the
          policy is written to carry forward as additional municipalities are added.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <section className="space-y-4 text-base leading-8 text-ink/75">
            <h2 className="font-serif text-2xl text-moss">Auto-publish eligible</h2>
            <p>Newly posted agendas, meeting notices, official alerts, official news posts, approved minutes, and routine public service notices.</p>
            <p>Summaries stay terse, factual, and source-grounded. They do not infer outcomes beyond the source material.</p>
          </section>
          <section className="space-y-4 text-base leading-8 text-ink/75">
            <h2 className="font-serif text-2xl text-moss">Manual review required</h2>
            <p>Zoning and land use matters, nuanced planning materials, budget interpretation, personnel topics, and anything with low extraction confidence.</p>
            <p>These items are routed to a review state instead of publishing automatically.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
