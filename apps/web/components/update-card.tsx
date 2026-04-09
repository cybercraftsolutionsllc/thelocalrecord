type UpdateCardProps = {
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  sourceLabel: string;
  sourceLinks: Array<{ label: string; url: string }>;
  extractionNote?: string | null;
};

function formatCategory(category: string) {
  return category.split("_").join(" ");
}

function formatPublishedDate(publishedAt: string) {
  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return publishedAt;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function UpdateCard(props: UpdateCardProps) {
  const sourceLinks = Array.isArray(props.sourceLinks) ? props.sourceLinks : [];

  return (
    <article className="rounded-[2rem] border border-ink/10 bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-moss">
          {formatCategory(props.category)}
        </span>
        <span className="text-sm text-ink/60">
          Published {formatPublishedDate(props.publishedAt)}
        </span>
      </div>

      <h3 className="font-serif text-2xl text-moss">{props.title}</h3>
      <p className="mt-3 text-base leading-7 text-ink/80">{props.summary}</p>

      {props.extractionNote ? (
        <p className="mt-4 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-ink/75">
          Extraction note: {props.extractionNote}
        </p>
      ) : null}

      <div className="mt-5 border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold text-ink">Sources: {props.sourceLabel}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {sourceLinks.map((link) => (
            <a
              key={`${props.title}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-moss/15 px-3 py-2 text-moss transition hover:bg-sky"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
