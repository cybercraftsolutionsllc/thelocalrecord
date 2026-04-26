type CommunityAtlasProps = {
  slug: string;
};

const residentScans = [
  {
    label: "Development near me",
    detail: "Find planning items, agendas, hearings, and project notices.",
    query: "land development",
    signal: "Growth"
  },
  {
    label: "Roads I use",
    detail: "Check closures, detours, bridge work, and traffic advisories.",
    query: "Route 30",
    signal: "Travel"
  },
  {
    label: "My street or park",
    detail: "Search a street, park, intersection, or local landmark.",
    query: "park",
    signal: "Place"
  },
  {
    label: "What board has it?",
    detail: "Trace a topic to agendas, minutes, notices, and source pages.",
    query: "Planning Commission",
    signal: "Meeting"
  }
];

const civicSteps = [
  "Search a property clue",
  "Scan matching records",
  "Open the source trail",
  "Watch the next date"
];

export function CommunityAtlas({ slug }: CommunityAtlasProps) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5">
      <p className="text-sm font-semibold text-moss">How residents use it</p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">
        One search should answer the next obvious question.
      </h2>

      <div className="mt-5 divide-y divide-ink/8">
        {civicSteps.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky text-sm font-bold text-moss">
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-ink">{step}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-lg border border-ink/10 bg-sand/35 px-4 py-3 text-xs leading-6 text-ink/62">
        This is not an official parcel search. It is a resident-friendly scan of
        source-linked local records.
      </p>

      <div className="mt-5 divide-y divide-ink/8 border-t border-ink/8 pt-2">
        {residentScans.map((scan) => (
          <a
            key={scan.label}
            href={`/${slug}?q=${encodeURIComponent(scan.query)}#records`}
            className="group block py-4 first:pt-0 last:pb-0"
            title={`Search the local record for ${scan.query}`}
          >
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-moss">
              {scan.signal}
            </span>
            <h3 className="mt-2 text-lg font-semibold leading-6 text-ink">
              {scan.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/62">{scan.detail}</p>
            <span className="mt-3 inline-flex text-sm font-semibold text-moss underline-offset-4 group-hover:underline">
              Scan for {scan.query}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
