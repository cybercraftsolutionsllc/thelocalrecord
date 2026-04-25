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
  official_news: "Township news",
  official_alert: "Official alert",
  agenda_posted: "Agenda posted",
  approved_minutes: "Meeting minutes",
  meeting_notice: "Meeting notice",
  calendar_update: "Calendar update",
  planning_zoning: "Planning item",
  service_notice: "Service notice"
};

const CATEGORY_TONES: Record<
  string,
  {
    badge: string;
    accent: string;
  }
> = {
  official_news: {
    badge: "bg-sky text-moss",
    accent: "bg-sky/45"
  },
  official_alert: {
    badge: "bg-clay/15 text-clay",
    accent: "bg-clay/45"
  },
  agenda_posted: {
    badge: "bg-[#e8f0ea] text-moss",
    accent: "bg-[#d4e6da]"
  },
  approved_minutes: {
    badge: "bg-[#eef0e8] text-moss",
    accent: "bg-[#dfe6d6]"
  },
  meeting_notice: {
    badge: "bg-[#e8f0ea] text-moss",
    accent: "bg-[#d4e6da]"
  },
  calendar_update: {
    badge: "bg-[#eef4f6] text-moss",
    accent: "bg-[#dbe8ec]"
  },
  planning_zoning: {
    badge: "bg-[#eef0e8] text-moss",
    accent: "bg-[#dfe6d6]"
  },
  service_notice: {
    badge: "bg-[#f3ece3] text-clay",
    accent: "bg-[#ead8c6]"
  }
};

function formatCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category.split("_").join(" ");
}

function categoryTone(category: string) {
  return (
    CATEGORY_TONES[category] ?? {
      badge: "bg-sky text-moss",
      accent: "bg-sky/45"
    }
  );
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

  if (candidate.length <= 1200) {
    return candidate;
  }

  return `${candidate.slice(0, 1197).trimEnd()}...`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getResidentSignal(props: UpdateCardProps) {
  const haystack =
    `${props.title} ${props.summary} ${props.category} ${props.topicText ?? ""}`.toLowerCase();

  if (/closure|detour|traffic|route|road|bridge|alert/.test(haystack)) {
    return "Travel impact";
  }

  if (/ordinance|hearing|agenda|minutes|commission|board|meeting|notice/.test(haystack)) {
    return "Decision to watch";
  }

  if (/permit|code|zoning|inspection|occupancy|variance/.test(haystack)) {
    return "Property rules";
  }

  if (/park|trail|recreation|program|festival|volunteer/.test(haystack)) {
    return "Community amenity";
  }

  return "Local update";
}

export function UpdateCard(props: UpdateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceLinks = Array.isArray(props.sourceLinks) ? props.sourceLinks : [];
  const tone = categoryTone(props.category);
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
    <article className="relative overflow-hidden rounded-[1.25rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
      <div
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-1.5 ${tone.accent}`}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone.badge}`}
          >
            {formatCategory(props.category)}
          </span>
          <span className="rounded-full border border-ink/10 bg-[#f8f6ef] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#183f47]">
            {getResidentSignal(props)}
          </span>
        </div>
        <span className="rounded-full border border-ink/10 bg-sand/35 px-3 py-1 text-xs font-semibold text-ink/62">
          {datedLabel}
        </span>
      </div>

      <h3 className="text-balance font-serif text-2xl leading-tight text-moss sm:text-[1.85rem]">
        {props.title}
      </h3>
      <p className="mt-3 max-w-4xl text-base leading-8 text-ink/82">
        {props.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/48">
        <span>{props.sourceLabel}</span>
        <span aria-hidden="true">/</span>
        <span>source-linked</span>
      </div>

      {canExpand ? (
        <div className="mt-5 rounded-[1rem] border border-moss/10 bg-sand/35 px-4 py-4">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-sm font-semibold text-moss underline-offset-4 transition hover:text-ink hover:underline"
          >
            {expanded ? "Show less" : "Read more from the source text"}
          </button>
          {expanded ? (
            <p className="mt-3 text-sm leading-7 text-ink/78">
              {expandedExcerpt}
            </p>
          ) : null}
        </div>
      ) : null}

      {props.extractionNote ? (
        <div className="mt-5 rounded-[1rem] border border-clay/20 bg-clay/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
            Extraction note
          </p>
          <p className="mt-2 text-sm leading-7 text-ink/75">
            {props.extractionNote}
          </p>
        </div>
      ) : null}

      <div className="mt-6 rounded-[1rem] border border-ink/10 bg-sand/45 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
              Verify this record
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {props.sourceLabel}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {props.detailUrl ? (
            <a
              href={props.detailUrl}
              className="rounded-[0.8rem] border border-moss/15 bg-moss px-3 py-2 font-semibold text-white transition hover:bg-moss/90"
            >
              Open record details
            </a>
          ) : null}
          {sourceLinks.map((link) => (
            <a
              key={`${props.title}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-[0.8rem] border border-moss/15 bg-white px-3 py-2 text-moss transition hover:bg-sky"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
