"use client";

import { useState } from "react";

import { buildRecordSignal } from "../lib/record-signals";

type UpdateCardProps = {
  id?: string;
  title: string;
  summary: string;
  category: string;
  impactLevel?: string;
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

function sourceButtonLabel(label: string) {
  if (label === "Original post" || label === "Original document") {
    return "Open official source";
  }

  return label;
}

export function UpdateCard(props: UpdateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceLinks = Array.isArray(props.sourceLinks) ? props.sourceLinks : [];
  const signal = buildRecordSignal({
    id: props.id ?? props.title,
    title: props.title,
    summary: props.summary,
    category: props.category,
    impactLevel: props.impactLevel,
    publishedAt: props.publishedAt,
    sourceMaterialDate: props.sourceMaterialDate,
    sourceLabel: props.sourceLabel,
    sourceLinks,
    detailUrl: props.detailUrl,
    extractionNote: props.extractionNote,
    topicText: props.topicText
  });
  const datedLabel =
    props.sourceMaterialDate && props.sourceMaterialDate !== props.publishedAt
      ? formatPublishedDate(props.sourceMaterialDate)
      : formatPublishedDate(props.publishedAt);
  const expandedExcerpt = buildExpandedExcerpt(
    props.title,
    props.summary,
    props.topicText
  );
  const canExpand = expandedExcerpt.length > 0 || props.summary.length > 220;
  const important =
    props.impactLevel === "important" ||
    props.impactLevel === "critical_source";

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-[#0b171d]/95 shadow-card ${
        important ? "border-white/16" : "border-white/12"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/44">
          <span className="rounded-full border border-moss/30 bg-moss/14 px-3 py-1 text-sky">
            {signal.laneLabel}
          </span>
          <span className={important ? "text-clay" : ""}>
            {signal.importanceLabel}
          </span>
          <span>{formatCategory(props.category)}</span>
          <span>{datedLabel}</span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.34fr)]">
          <div>
            <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              {props.title}
            </h3>
            <p
              className={`mt-2 text-sm leading-6 text-white/68 sm:text-base sm:leading-7 ${
                expanded ? "" : "clamp-2"
              }`}
            >
              {props.summary}
            </p>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm">
            <p className="font-semibold text-white">Resident read</p>
            <p className="mt-2 leading-6 text-white/64">
              <span className="font-semibold text-white">Why: </span>
              {signal.why}
            </p>
            <p className="mt-2 leading-6 text-white/64">
              <span className="font-semibold text-white">Do next: </span>
              {signal.dateToKnow ? `${signal.dateToKnow}. ` : ""}
              {signal.action}
            </p>
          </aside>
        </div>

        {canExpand || props.extractionNote ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            {canExpand ? (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded((current) => !current)}
                  className="text-sm font-semibold text-sky underline-offset-4 hover:underline"
                >
                  {expanded ? "Less" : "More context"}
                </button>
                {expanded && expandedExcerpt ? (
                  <p className="mt-3 text-sm leading-7 text-white/64">
                    {expandedExcerpt}
                  </p>
                ) : null}
              </>
            ) : null}

            {expanded && props.extractionNote ? (
              <p className="mt-3 text-sm leading-6 text-white/54">
                {props.extractionNote}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-white/52">
            Source:{" "}
            <span className="font-semibold text-white">
              {props.sourceLabel}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {props.detailUrl ? (
              <a
                href={props.detailUrl}
                className="rounded-lg bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d66d8]"
              >
                Read record
              </a>
            ) : null}
            {sourceLinks.map((link) => (
              <a
                key={`${props.title}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/12 px-3 py-2 text-sm font-semibold text-white/70 transition hover:border-moss/35 hover:bg-white/10 hover:text-white"
              >
                {sourceButtonLabel(link.label)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
