type LocalitiesMapProps = {
  activeSlug: string;
};

const LOCALITY_AREAS: Record<
  string,
  {
    label: string;
    href: string;
    polygon: string;
    markerX: number;
    markerY: number;
  }
> = {
  manheimtownshippa: {
    label: "Manheim Township",
    href: "/manheimtownshippa",
    polygon: "291,176 301,171 313,176 315,188 303,195 292,189",
    markerX: 303,
    markerY: 183
  }
};

export function LocalitiesMap({ activeSlug }: LocalitiesMapProps) {
  const locality = LOCALITY_AREAS[activeSlug];

  return (
    <div className="rounded-[2rem] bg-moss px-6 py-6 text-white shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
            Locality map
          </p>
          <h2 className="text-balance mt-2 font-serif text-3xl leading-tight text-sand">
            Pennsylvania launch footprint
          </h2>
          <p className="text-pretty mt-3 max-w-xl text-sm leading-7 text-white/75">
            Supported localities can be selected from the map or the directory.
            The highlighted area marks the current launch locality.
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky">
          Static boundary preview
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white/10 p-4">
        <svg
          viewBox="0 0 520 300"
          role="img"
          aria-label="Map of Pennsylvania with supported localities highlighted"
          className="h-auto w-full"
        >
          <defs>
            <filter id="localityGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M44 68 70 58 139 53 214 45 267 44 345 44 444 52 470 57 476 141 474 232 356 240 321 246 255 252 180 252 102 248 48 245 45 179 42 118Z"
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(226,239,240,0.55)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          <path
            d="M69 81 131 76 203 71 271 67 344 68 433 75"
            stroke="rgba(226,239,240,0.18)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M60 119 144 114 253 109 357 110 456 119"
            stroke="rgba(226,239,240,0.18)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M57 160 136 157 248 154 352 156 461 163"
            stroke="rgba(226,239,240,0.18)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M55 199 136 199 250 201 349 205 461 213"
            stroke="rgba(226,239,240,0.18)"
            strokeWidth="2"
            fill="none"
          />

          {locality ? (
            <>
              <a href={locality.href} aria-label={`Open ${locality.label}`}>
                <polygon
                  points={locality.polygon}
                  fill="#d2e7ec"
                  stroke="#f4f0e3"
                  strokeWidth="3"
                  filter="url(#localityGlow)"
                />
              </a>
              <circle
                cx={locality.markerX}
                cy={locality.markerY}
                r="4"
                fill="#f4f0e3"
              />
              <path
                d={`M ${locality.markerX + 3} ${locality.markerY - 3} C 342 150, 370 130, 390 112`}
                stroke="#f4f0e3"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <g transform="translate(392 92)">
                <rect
                  width="100"
                  height="44"
                  rx="14"
                  fill="rgba(255,255,255,0.12)"
                  stroke="rgba(255,255,255,0.25)"
                />
                <text
                  x="14"
                  y="19"
                  fill="#d2e7ec"
                  fontSize="10"
                  fontWeight="700"
                  letterSpacing="2.2"
                >
                  LIVE LOCALITY
                </text>
                <text
                  x="14"
                  y="33"
                  fill="#f4f0e3"
                  fontSize="14"
                  fontWeight="700"
                >
                  {locality.label}
                </text>
              </g>
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
