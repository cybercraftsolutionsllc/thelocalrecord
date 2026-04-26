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
      <div className="absolute inset-0 bg-gradient-to-t from-ink/62 via-ink/12 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/76">
          {label}
        </p>
        <p className="mt-2 max-w-xl font-serif text-2xl leading-tight">
          {caption}
        </p>
      </div>
    </div>
  );
}
