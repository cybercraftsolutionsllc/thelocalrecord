"use client";

import { useState } from "react";

type UpdateCardProps = {
  id?: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  sourceMaterialDate?: string | null;
  sourceLabel: string;
  sourceLinks: Array<{ label: string; url: string }>;
  detailUrl?: string;
  extractionNote?: string | null;
  topicText?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  official_news: "News",
  official_alert: "Alert",
  agenda_posted: "Agenda",
  approved_minutes: "Minutes",
  meeting_notice: "Meeting",
  calendar_update: "Calendar",
  planning_zoning: "Planning",
  service_notice: "Service"
};

function formatCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category.split("_").join(" ");
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
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function compactValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildExpandedExcerpt(
  title: string,
  summary: string,
  topicText?: string
) {
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

  if (
    normalizedSummary &&
    candidate.toLowerCase().startsWith(normalizedSummary.toLowerCase())
  ) {
    candidate = candidate.slice(normalizedSummary.length).trim();
  }

  if (candidate.length < 120) {
    return "";
  }

  if (candidate.length <= 900) {
    return candidate;
  }

  return `${candidate.slice(0, 897).trimEnd()}...`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function UpdateCard(props: UpdateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceLinks = Array.isArray(props.sourceLinks) ? props.sourceLinks : [];
  const datedLabel =
    props.sourceMaterialDate && props.sourceMaterialDate !== props.publishedAt
      ? formatPublishedDate(props.sourceMaterialDate)
      : formatPublishedDate(props.publishedAt);
  const expandedExcerpt = buildExpandedExcerpt(
    props.title,
    props.summary,
    props.topicText
  );
  const canExpand = expandedExcerpt.length > 0;

  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/54">
        <span className="font-semibold text-moss">
          {formatCategory(props.category)}
        </span>
        <span>{datedLabel}</span>
        <span>{props.sourceLabel}</span>
      </div>

      <h3 className="mt-3 font-serif text-2xl leading-tight text-ink">
        {props.title}
      </h3>
      <p className="mt-3 text-base leading-7 text-ink/72">{props.summary}</p>

      {canExpand ? (
        <div className="mt-4 border-t border-ink/8 pt-4">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-sm font-semibold text-moss underline-offset-4 hover:underline"
          >
            {expanded ? "Show less" : "More source text"}
          </button>
          {expanded ? (
            <p className="mt-3 text-sm leading-7 text-ink/68">
              {expandedExcerpt}
            </p>
          ) : null}
        </div>
      ) : null}

      {props.extractionNote ? (
        <p className="mt-4 rounded-md border border-clay/15 bg-sand px-3 py-2 text-sm leading-6 text-ink/64">
          {props.extractionNote}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/8 pt-4">
        {props.detailUrl ? (
          <a
            href={props.detailUrl}
            className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Details
          </a>
        ) : null}
        {sourceLinks.map((link) => (
          <a
            key={`${props.title}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
          >
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}
