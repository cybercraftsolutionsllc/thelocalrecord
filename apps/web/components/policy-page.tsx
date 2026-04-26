import type { ReactNode } from "react";

export function PolicyPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="border-b border-ink/10 pb-8">
        <p className="text-sm font-semibold text-moss">Platform policy</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">
          How The Local Record works
        </h1>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="divide-y divide-ink/8">
          <PolicyNote title="Independent">
            This is not an official notice system and does not speak for any
            municipality.
          </PolicyNote>
          <PolicyNote title="Source-linked">
            Public entries and answers are meant to point you back to the
            original source.
          </PolicyNote>
          <PolicyNote title="Correctable">
            Reports and corrections stay tied to the underlying source trail.
          </PolicyNote>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="space-y-7 text-base leading-8 text-ink/70">
          <section className="space-y-3">
            <h2 className="font-serif text-2xl text-ink">Publishing rules</h2>
            <p>
              Official township and government sources publish automatically.
            </p>
            <p>Unofficial sources go to review instead of the public feed.</p>
            <p>
              Summaries aim to explain what changed, what it means, and any
              dates or actions stated in the source.
            </p>
          </section>

          <section className="space-y-3 border-t border-ink/8 pt-7">
            <h2 className="font-serif text-2xl text-ink">Transparency rules</h2>
            <p>
              Every public entry links back to the underlying source material.
            </p>
            <p>
              Fetched source material is hashed and retained for auditability.
            </p>
            <p>
              Corrections can be reported through the site and reviewed against
              the original source.
            </p>
          </section>
        </div>
      </section>

      <section className="rounded-lg border border-clay/20 bg-white p-5">
        <h2 className="font-serif text-2xl text-ink">
          AI and liability disclaimer
        </h2>
        <div className="mt-4 space-y-3 text-base leading-8 text-ink/70">
          <p>
            Summaries may be assisted by automated systems, including AI, but
            they are intended as informational digests only.
          </p>
          <p>
            The Local Record is not an official government notice system, does
            not provide legal advice, and should not be treated as a substitute
            for reading the original source documents.
          </p>
          <p>
            If something is important to you, rely on the linked official source
            and not the summary alone.
          </p>
        </div>
      </section>
    </div>
  );
}

function PolicyNote({
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
