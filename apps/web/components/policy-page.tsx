export function PolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Platform policy
          </p>
          <h1 className="mt-3 font-serif text-4xl text-moss">
            How The Local Record works
          </h1>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Independent
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              This is not an official notice system and does not speak for any
              municipality.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Source-linked
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              Public entries and answers are meant to point you back to the
              original source.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-moss/10 bg-sand/35 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay">
              Correctable
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/75">
              Reports and corrections stay tied to the underlying source trail.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <section className="space-y-4 text-base leading-8 text-ink/75">
            <h2 className="font-serif text-2xl text-moss">Publishing rules</h2>
            <p>Official township and government sources publish automatically.</p>
            <p>Unofficial sources go to review instead of the public feed.</p>
            <p>
              Summaries aim to explain what changed, what it means, and any
              dates or actions stated in the source.
            </p>
          </section>

          <section className="space-y-4 text-base leading-8 text-ink/75">
            <h2 className="font-serif text-2xl text-moss">Transparency rules</h2>
            <p>Every public entry links back to the underlying source material.</p>
            <p>Fetched source material is hashed and retained for auditability.</p>
            <p>Corrections can be reported through the site and reviewed against the original source.</p>
          </section>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-clay/20 bg-clay/5 p-6">
          <h2 className="font-serif text-2xl text-moss">AI and liability disclaimer</h2>
          <div className="mt-4 space-y-3 text-base leading-8 text-ink/75">
            <p>
              Summaries may be assisted by automated systems, including AI, but
              they are intended as informational digests only.
            </p>
            <p>
              The Local Record is not an official government notice system,
              does not provide legal advice, and should not be treated as a
              substitute for reading the original source documents.
            </p>
            <p>
              If something is important to you, rely on the linked official
              source and not the summary alone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
