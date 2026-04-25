type CommunityAtlasProps = {
  slug: string;
};

const residentScans = [
  {
    label: "Development near me",
    detail: "Find planning items, agendas, hearings, and project notices.",
    query: "Ashford Meadows",
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
    query: "Overlook Park",
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
    <section className="overflow-hidden rounded-[1.25rem] border border-white/75 bg-white shadow-card">
      <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-[#183f47] px-6 py-6 text-white sm:px-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#aee4ef]">
            How residents use it
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-white">
            One search should answer the next obvious question.
          </h2>
          <div className="mt-6 grid gap-3">
            {civicSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-[0.9rem] border border-white/12 bg-white/8 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5c76b] text-sm font-bold text-[#173238]">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-white">{step}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-[1rem] border border-white/15 bg-white/10 px-4 py-3 text-xs leading-6 text-white/68">
            This is not an official parcel search. It is a resident-friendly
            scan of source-linked local records.
          </p>
        </div>

        <div className="grid gap-3 bg-[#f8f6ef] p-5 sm:grid-cols-2 sm:p-6">
          {residentScans.map((scan) => (
            <a
              key={scan.label}
              href={`/${slug}?q=${encodeURIComponent(scan.query)}#records`}
              className="group rounded-[1rem] border border-ink/10 bg-white px-4 py-4 shadow-sm transition hover:border-[#183f47]/25 hover:bg-[#eef7f9]"
              title={`Search the local record for ${scan.query}`}
            >
              <span className="inline-flex rounded-full bg-[#f5c76b]/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#173238]">
                {scan.signal}
              </span>
              <h3 className="mt-3 text-lg font-semibold leading-6 text-moss">
                {scan.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/62">
                {scan.detail}
              </p>
              <span className="mt-4 inline-flex text-sm font-semibold text-[#183f47] underline-offset-4 group-hover:underline">
                Scan for {scan.query}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
