import Link from "next/link";

export default function CorrectionsPage() {
  const correctionsEmail =
    process.env.CORRECTIONS_EMAIL ?? "cyber.craft@craftedcybersolutions.com";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Platform corrections policy</p>
            <h1 className="mt-3 font-serif text-4xl text-moss">Report an issue or request a correction</h1>
          </div>
          <Link
            href="/manheimtownshippa"
            className="rounded-full border border-moss/15 bg-sky/50 px-4 py-2 text-sm font-semibold text-moss"
          >
            Open live digest
          </Link>
        </div>
        <div className="mt-6 space-y-4 text-base leading-8 text-ink/75">
          <p>
            If you see a broken source link, missing context, or a factual error, send a report to
            <a className="ml-1 font-semibold text-moss" href={`mailto:${correctionsEmail}`}>
              {correctionsEmail}
            </a>
            .
          </p>
          <p>
            This page covers the platform as a whole. Municipality-specific entries should still include the
            digest URL and the underlying source material when you report a problem.
          </p>
          <p>Include the URL of the digest entry, the source material you believe we missed, and the issue you want reviewed.</p>
          <p>
            We aim to log correction requests, review source materials, and either update the entry or explain why no change was made.
          </p>
        </div>
      </div>
    </div>
  );
}
