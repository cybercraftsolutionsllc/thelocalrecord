type RecordVisualVariant = "map" | "town";

type RecordVisualProps = {
  caption: string;
  label: string;
  variant?: RecordVisualVariant;
};

const visualSrc: Record<RecordVisualVariant, string> = {
  map: "/images/site-background.png",
  town: "/images/manheim-hero.png"
};

export function RecordVisual({
  caption,
  label,
  variant = "map"
}: RecordVisualProps) {
  return (
    <div className="record-visual-shadow relative h-44 overflow-hidden rounded-lg border border-white/70 bg-white sm:h-52">
      <img
        src={visualSrc[variant]}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-ink/16" />
      <div className="absolute inset-x-4 bottom-4 max-w-2xl rounded-lg border border-white/12 bg-ink/90 p-4 text-white shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky">
          {label}
        </p>
        <p className="mt-2 font-serif text-2xl leading-tight">{caption}</p>
      </div>
    </div>
  );
}
