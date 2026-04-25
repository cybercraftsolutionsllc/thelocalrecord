type CommunityAtlasProps = {
  slug: string;
};

const atlasPoints = [
  {
    label: "Municipal Office",
    detail: "meetings and public records",
    x: 240,
    y: 118,
    query: "Board of Commissioners"
  },
  {
    label: "Route 30 / 222",
    detail: "traffic and detours",
    x: 322,
    y: 190,
    query: "Route 30"
  },
  {
    label: "Overlook Park",
    detail: "parks and programs",
    x: 164,
    y: 152,
    query: "Overlook Park"
  },
  {
    label: "Lititz Pike / Kreider",
    detail: "Ashford Meadows area",
    x: 252,
    y: 56,
    query: "Ashford Meadows"
  },
  {
    label: "Richmond Square",
    detail: "infill and mixed-use plans",
    x: 384,
    y: 104,
    query: "Richmond Square"
  }
];

export function CommunityAtlas({ slug }: CommunityAtlasProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/75 bg-white shadow-card">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-moss px-6 py-6 text-white sm:px-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
            Community atlas
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-sand">
            Turn records into places residents recognize.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/76">
            A first-pass civic map connects recurring source topics to familiar
            township anchors: meeting rooms, parks, corridors, and development
            areas.
          </p>
          <p className="mt-4 rounded-[1rem] border border-white/15 bg-white/10 px-4 py-3 text-xs leading-6 text-white/68">
            Conceptual map for orientation only. Use the cited township source
            for official parcel, boundary, and legal records.
          </p>
        </div>

        <div className="relative min-h-[360px] bg-[#f8f6ef] p-5">
          <svg
            viewBox="0 0 520 300"
            role="img"
            aria-label="Conceptual Manheim Township civic map with recurring record locations"
            className="h-auto w-full"
          >
            <defs>
              <linearGradient id="atlasLand" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#eef4f6" />
                <stop offset="100%" stopColor="#e6eadf" />
              </linearGradient>
            </defs>

            <path
              d="M93 46 160 22 263 25 349 43 434 84 467 151 424 232 319 270 202 262 101 219 54 131Z"
              fill="url(#atlasLand)"
              stroke="#20403a"
              strokeOpacity="0.18"
              strokeWidth="3"
            />
            <path
              d="M93 166 C158 142 222 137 284 152 C345 166 392 171 450 151"
              stroke="#b45d3d"
              strokeWidth="9"
              strokeLinecap="round"
              opacity="0.25"
              fill="none"
            />
            <path
              d="M103 91 C171 103 224 117 277 118 C335 119 382 103 431 86"
              stroke="#20403a"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.2"
              fill="none"
            />
            <path
              d="M233 34 C231 93 235 153 252 245"
              stroke="#20403a"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.18"
              fill="none"
            />
            <path
              d="M367 61 C342 111 323 164 305 240"
              stroke="#20403a"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.16"
              fill="none"
            />

            {atlasPoints.map((point) => (
              <g key={point.label}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="#20403a"
                  opacity="0.16"
                />
                <circle cx={point.x} cy={point.y} r="5" fill="#b45d3d" />
              </g>
            ))}
          </svg>

          <div className="absolute inset-x-5 bottom-5 grid gap-2 sm:grid-cols-2">
            {atlasPoints.map((point) => (
              <a
                key={point.label}
                href={`/${slug}?q=${encodeURIComponent(point.query)}#records`}
                className="rounded-[0.85rem] border border-ink/10 bg-white/88 px-3 py-3 text-sm shadow-sm backdrop-blur transition hover:border-moss/25 hover:bg-white"
                title={`Search the digest for ${point.query}`}
              >
                <span className="block font-semibold text-moss">
                  {point.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-ink/62">
                  {point.detail}
                </span>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-clay">
                  Search records
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
