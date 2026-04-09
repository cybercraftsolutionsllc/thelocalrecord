import { sourceRegistry } from "@thelocalrecord/core";

export default function SourceInventoryPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Transparency</p>
        <h1 className="mt-3 font-serif text-4xl text-moss">Source inventory</h1>
        <div className="mt-8 grid gap-4">
          {sourceRegistry.map((source) => (
            <article key={source.slug} className="rounded-[1.5rem] border border-ink/10 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-2xl text-moss">{source.name}</h2>
                <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  {source.implemented ? "Implemented" : "Planned"}
                </span>
              </div>
              <p className="mt-3 text-base leading-7 text-ink/75">{source.description}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-moss"
              >
                Open source
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
