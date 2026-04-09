export default function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Editorial policy</p>
        <h1 className="mt-3 font-serif text-4xl text-moss">How this digest decides what to publish</h1>
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
