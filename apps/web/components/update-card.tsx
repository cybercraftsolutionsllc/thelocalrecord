"use client";

import { useState } from "react";

type UpdateCardProps = {
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  sourceMaterialDate?: string | null;
  sourceLabel: string;
  sourceLinks: Array<{ label: string; url: string }>;
  extractionNote?: string | null;
  topicText?: string;
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

function compactValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildExpandedExcerpt(title: string, summary: string, topicText?: string) {
  const compactTopic = compactValue(topicText ?? "");

  if (!compactTopic) {
    return "";
  }

  const withoutTitle = compactTopic
    .replace(new RegExp(escapeRegExp(title), "ig"), "")
    .trim();
  const normalizedSummary = compactValue(summary)
    .replace(/\.\.\.$/, "")
    .trim();
  let candidate = withoutTitle || compactTopic;

  if (normalizedSummary && candidate.toLowerCase().startsWith(normalizedSummary.toLowerCase())) {
    candidate = candidate.slice(normalizedSummary.length).trim();
  }

  if (candidate.length < 120) {
    return "";
  }

  if (candidate.length <= 1200) {
    return candidate;
  }

  return `${candidate.slice(0, 1197).trimEnd()}...`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function UpdateCard(props: UpdateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceLinks = Array.isArray(props.sourceLinks) ? props.sourceLinks : [];
  const datedLabel =
    props.sourceMaterialDate && props.sourceMaterialDate !== props.publishedAt
      ? `Source date ${formatPublishedDate(props.sourceMaterialDate)}`
      : `Published ${formatPublishedDate(props.publishedAt)}`;
  const expandedExcerpt = buildExpandedExcerpt(
    props.title,
    props.summary,
    props.topicText
  );
  const canExpand = expandedExcerpt.length > 0;

  return (
    <article className="rounded-[2rem] border border-white/75 bg-white p-6 shadow-card sm:p-7">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-moss">
          {formatCategory(props.category)}
        </span>
        <span className="text-sm text-ink/60">{datedLabel}</span>
      </div>

      <h3 className="text-balance font-serif text-[2rem] leading-tight text-moss">
        {props.title}
      </h3>
      <p className="mt-4 text-base leading-8 text-ink/80">{props.summary}</p>

      {canExpand ? (
        <div className="mt-4 rounded-[1.5rem] border border-moss/10 bg-sand/35 px-4 py-4">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-sm font-semibold text-moss underline-offset-4 transition hover:text-ink hover:underline"
          >
            {expanded ? "Show less" : "Read more from the source text"}
          </button>
          {expanded ? (
            <p className="mt-3 text-sm leading-7 text-ink/78">{expandedExcerpt}</p>
          ) : null}
        </div>
      ) : null}

      {props.extractionNote ? (
        <p className="mt-5 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm leading-7 text-ink/75">
          Extraction note: {props.extractionNote}
        </p>
      ) : null}

      <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-sand/50 p-4">
        <p className="text-sm font-semibold text-ink">
          Source: {props.sourceLabel}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {sourceLinks.map((link) => (
            <a
              key={`${props.title}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-moss/15 bg-white px-3 py-2 text-moss transition hover:bg-sky"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
