"use client";

import { useEffect, useMemo, useState } from "react";

import { contentApiBase } from "../lib/public-config";

type MeetingFact = {
  id: string;
  fact_kind: string;
  label: string;
  summary: string;
  quote: string | null;
  source_type: string;
  source_url: string;
  source_label: string;
  transcript_start_seconds: number | null;
  transcript_end_seconds: number | null;
  confidence: number;
  project_name: string | null;
};

type ProjectEvent = {
  id: string;
  event_kind: string;
  summary: string;
  quote: string | null;
  source_type: string;
  source_url: string;
  confidence: number;
  event_date: string | null;
  project_name: string;
};

type SourceTrailItem = {
  label: string;
  url: string;
  sourceType: string;
};

type MeetingRecord = {
  id: string;
  content_entry_id: string;
  meeting_title: string;
  meeting_body: string;
  meeting_date: string | null;
  posted_at: string | null;
  source_type: string;
  source_url: string;
  source_label: string;
  source_trail_json: string;
  published_at: string | null;
  facts: MeetingFact[];
  projects: ProjectEvent[];
};

type MeetingsPayload = {
  meetings: MeetingRecord[];
};

type LocalityMeetingIntelligenceProps = {
  slug: string;
};

type SourceFilter = "all" | "agenda" | "minutes" | "recording";
type FactFilter =
  | "all"
  | "decision"
  | "project_update"
  | "condition"
  | "public_comment";

type MeetingView = {
  meeting: MeetingRecord;
  facts: MeetingFact[];
  trail: SourceTrailItem[];
};

const sourceFilterLabels: Record<SourceFilter, string> = {
  all: "All meetings",
  agenda: "Agendas",
  minutes: "Minutes",
  recording: "Recordings"
};

const factFilterLabels: Record<FactFilter, string> = {
  all: "Everything",
  decision: "Decisions",
  project_update: "Projects",
  condition: "Conditions",
  public_comment: "Public comment"
};

const factLabels: Record<string, string> = {
  decision: "Decision",
  project_update: "Project",
  condition: "Condition",
  next_step: "Next step",
  public_comment: "Comment",
  recording_reference: "Recording"
};

export function LocalityMeetingIntelligence({
  slug
}: LocalityMeetingIntelligenceProps) {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [factFilter, setFactFilter] = useState<FactFilter>("all");
  const [openMeetingId, setOpenMeetingId] = useState<string | null>(null);
  const [openExcerptId, setOpenExcerptId] = useState<string | null>(null);

  useEffect(() => {
    if (!contentApiBase) {
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      try {
        const response = await fetch(
          `${contentApiBase}/api/localities/${slug}/meetings?limit=12`,
          {
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load meeting records");
        }

        const payload = (await response.json()) as MeetingsPayload;

        if (!cancelled) {
          const nextMeetings = payload.meetings ?? [];
          setMeetings(nextMeetings);
          setOpenMeetingId(nextMeetings[0]?.id ?? null);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const meetingViews = useMemo(
    () =>
      meetings.map((meeting) => ({
        meeting,
        facts: getDisplayFacts(meeting),
        trail: parseSourceTrail(meeting.source_trail_json)
      })),
    [meetings]
  );
  const sourceOptions = useMemo(
    () =>
      (["all", "agenda", "minutes", "recording"] as SourceFilter[])
        .map((key) => ({
          key,
          label: sourceFilterLabels[key],
          count:
            key === "all"
              ? meetingViews.length
              : meetingViews.filter((view) =>
                  getSourceFilterKey(view.meeting.source_type).includes(key)
                ).length
        }))
        .filter((option) => option.key === "all" || option.count > 0),
    [meetingViews]
  );
  const factOptions = useMemo(
    () =>
      (
        [
          "all",
          "decision",
          "project_update",
          "condition",
          "public_comment"
        ] as FactFilter[]
      )
        .map((key) => ({
          key,
          label: factFilterLabels[key],
          count:
            key === "all"
              ? meetingViews.reduce(
                  (total, view) => total + view.facts.length,
                  0
                )
              : meetingViews.reduce(
                  (total, view) =>
                    total +
                    view.facts.filter((fact) => fact.fact_kind === key).length,
                  0
                )
        }))
        .filter((option) => option.key === "all" || option.count > 0),
    [meetingViews]
  );
  const filteredMeetings = useMemo(
    () =>
      meetingViews
        .map((view) => {
          const sourceMatches =
            sourceFilter === "all" ||
            getSourceFilterKey(view.meeting.source_type).includes(sourceFilter);
          const facts =
            factFilter === "all"
              ? view.facts
              : view.facts.filter((fact) => fact.fact_kind === factFilter);

          return sourceMatches ? { ...view, facts } : null;
        })
        .filter((view): view is MeetingView => {
          if (!view) {
            return false;
          }

          return factFilter === "all" || view.facts.length > 0;
        }),
    [factFilter, meetingViews, sourceFilter]
  );

  if (status === "error") {
    return null;
  }

  return (
    <section
      id="meeting-intelligence"
      className="scroll-mt-24 rounded-2xl border border-white/[0.12] bg-[#0b171d]/95 text-white shadow-card"
    >
      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-sky">
            <span>Meeting records</span>
            <span className="rounded-md border border-white/[0.10] bg-white/[0.045] px-2 py-1 text-xs text-white/[0.58]">
              Planning Commission parsed in detail
            </span>
          </div>
          <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white">
            Meeting details that affect real projects
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.62]">
            Parsed agenda and minutes records show decisions, conditions,
            public comments, and source documents without making residents dig
            through PDFs first.
          </p>
        </div>

        {status === "loading" || status === "idle" ? (
          <p className="border-t border-white/[0.10] pt-5 text-sm leading-6 text-white/[0.62]">
            Loading meeting records...
          </p>
        ) : null}

        {status === "ready" && meetings.length === 0 ? (
          <p className="border-t border-white/[0.10] pt-5 text-sm leading-6 text-white/[0.62]">
            No structured meeting records are available yet.
          </p>
        ) : null}

        {meetings.length > 0 ? (
          <>
            <div className="grid gap-4 border-t border-white/[0.10] pt-5 md:grid-cols-2">
              <FilterGroup
                label="Source"
                options={sourceOptions}
                active={sourceFilter}
                onSelect={(key) => setSourceFilter(key as SourceFilter)}
              />
              <FilterGroup
                label="Item type"
                options={factOptions}
                active={factFilter}
                onSelect={(key) => setFactFilter(key as FactFilter)}
              />
            </div>

            <div className="divide-y divide-white/[0.10] border-t border-white/[0.10]">
              {filteredMeetings.map((view) => (
                <MeetingPanel
                  key={view.meeting.id}
                  slug={slug}
                  view={view}
                  open={openMeetingId === view.meeting.id}
                  onToggleOpen={() =>
                    setOpenMeetingId((current) =>
                      current === view.meeting.id ? null : view.meeting.id
                    )
                  }
                  openExcerptId={openExcerptId}
                  onToggleExcerpt={(factId) =>
                    setOpenExcerptId((current) =>
                      current === factId ? null : factId
                    )
                  }
                />
              ))}
            </div>

            {filteredMeetings.length === 0 ? (
              <div className="border-t border-dashed border-white/[0.15] py-6 text-sm leading-6 text-white/[0.64]">
                No meeting records match those filters.
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onSelect
}: {
  label: string;
  options: Array<{ key: string; label: string; count: number }>;
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.42]">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={active === option.key}
            onClick={() => onSelect(option.key)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              active === option.key
                ? "bg-moss text-white"
                : "border border-white/[0.10] bg-white/[0.06] text-white/[0.64] hover:border-moss/[0.35] hover:bg-moss/[0.14] hover:text-white"
            }`}
          >
            {option.label} ({option.count})
          </button>
        ))}
      </div>
    </div>
  );
}

function MeetingPanel({
  slug,
  view,
  open,
  onToggleOpen,
  openExcerptId,
  onToggleExcerpt
}: {
  slug: string;
  view: MeetingView;
  open: boolean;
  onToggleOpen: () => void;
  openExcerptId: string | null;
  onToggleExcerpt: (factId: string) => void;
}) {
  const { meeting, facts, trail } = view;
  const primarySource = trail[0] ?? {
    label: meeting.source_label,
    url: meeting.source_url,
    sourceType: meeting.source_type
  };

  return (
    <article className="py-6 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/[0.54]">
        <span className="font-semibold text-sky">
          {formatSourceType(meeting.source_type)}
        </span>
        <span>{formatDate(meeting.meeting_date ?? meeting.posted_at)}</span>
        <span>{meeting.meeting_body}</span>
        <span>{facts.length > 0 ? `${facts.length} items` : "Source linked"}</span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-white">
          {meeting.meeting_title}
        </h3>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleOpen}
            className="rounded-lg border border-white/[0.12] px-3 py-2 text-sm font-semibold text-white/[0.70] transition hover:bg-white/[0.10] hover:text-white"
          >
            {open ? "Hide items" : "Show items"}
          </button>
          <a
            href={`/${slug}/item/?id=${encodeURIComponent(meeting.content_entry_id)}`}
            className="rounded-lg bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d66d8]"
          >
            Local record
          </a>
          <a
            href={primarySource.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/[0.12] px-3 py-2 text-sm font-semibold text-white/[0.70] transition hover:bg-white/[0.10] hover:text-white"
          >
            {sourceActionLabel(primarySource.label)}
          </a>
        </div>
      </div>

      {!open && facts.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-white/[0.58]">
          {facts.slice(0, 3).map(cleanFactTitle).join(", ")}
        </p>
      ) : null}

      {open && facts.length > 0 ? (
        <div className="mt-5 divide-y divide-white/[0.10] border-y border-white/[0.10]">
          {facts.map((fact) => (
            <FactItem
              key={fact.id}
              fact={fact}
              open={openExcerptId === fact.id}
              onToggle={() => onToggleExcerpt(fact.id)}
            />
          ))}
        </div>
      ) : null}

      {open && facts.length === 0 ? (
        <p className="mt-4 border-y border-white/[0.10] py-4 text-sm leading-6 text-white/[0.62]">
          No resident-facing action was extracted from this source yet.
        </p>
      ) : null}

      {trail.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {trail.slice(1, 4).map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-sky underline-offset-4 hover:underline"
            >
              {source.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function FactItem({
  fact,
  open,
  onToggle
}: {
  fact: MeetingFact;
  open: boolean;
  onToggle: () => void;
}) {
  const quote = shouldShowQuote(fact.summary, fact.quote) ? fact.quote : null;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-white/[0.46]">
        <span className="text-clay">
          {factLabels[fact.fact_kind] ?? "Source item"}
        </span>
        {fact.transcript_start_seconds !== null ? (
          <span>{formatTimestamp(fact.transcript_start_seconds)}</span>
        ) : null}
      </div>
      <h4 className="mt-2 text-base font-semibold leading-6 text-white">
        {cleanFactTitle(fact)}
      </h4>
      <p className="mt-2 text-sm leading-6 text-white/[0.68]">{fact.summary}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
        <a
          href={fact.source_url}
          target="_blank"
          rel="noreferrer"
          className="text-sky underline-offset-4 hover:underline"
        >
          {sourceActionLabel(fact.source_label)}
        </a>
        {quote ? (
          <button
            type="button"
            onClick={onToggle}
            className="text-white/[0.54] underline-offset-4 hover:text-sky hover:underline"
          >
            {open ? "Hide excerpt" : "View excerpt"}
          </button>
        ) : null}
      </div>

      {quote && open ? (
        <p className="mt-3 border-l-2 border-moss/[0.35] pl-3 text-sm leading-6 text-white/[0.58]">
          {quote}
        </p>
      ) : null}
    </div>
  );
}

function getDisplayFacts(meeting: MeetingRecord) {
  const byProjectAndKind = new Map<string, MeetingFact>();

  for (const fact of meeting.facts) {
    if (fact.fact_kind === "recording_reference" || !isUsefulFact(fact)) {
      continue;
    }

    const key = `${fact.fact_kind}|${normalizeComparableText(
      fact.project_name ?? fact.label
    )}`;
    const existing = byProjectAndKind.get(key);

    if (!existing || fact.summary.length > existing.summary.length) {
      byProjectAndKind.set(key, fact);
    }
  }

  return [...byProjectAndKind.values()].sort(
    (left, right) => factPriority(left.fact_kind) - factPriority(right.fact_kind)
  );
}

function isUsefulFact(fact: MeetingFact) {
  const text = `${fact.label} ${fact.summary} ${fact.quote ?? ""}`;

  return !/(?:action|briefing|public comment)\s*[-\u2013:]\s*none\b|plans?\s*[-\u2013:]\s*action\s*[-\u2013:]\s*none\b/i.test(
    text
  );
}

function factPriority(kind: string) {
  switch (kind) {
    case "decision":
      return 1;
    case "project_update":
      return 2;
    case "condition":
      return 3;
    case "next_step":
      return 4;
    case "public_comment":
      return 5;
    default:
      return 6;
  }
}

function cleanFactTitle(fact: MeetingFact) {
  const title = fact.project_name ?? fact.label;

  return title
    .replace(/^Project:\s*/i, "")
    .replace(/^Decision:\s*/i, "")
    .replace(/^Condition:\s*/i, "")
    .trim();
}

function getSourceFilterKey(sourceType: string): SourceFilter[] {
  if (sourceType.includes("agenda")) {
    return ["agenda"];
  }

  if (sourceType.includes("minute")) {
    return ["minutes"];
  }

  if (sourceType.includes("recording") || sourceType.includes("transcript")) {
    return ["recording"];
  }

  return ["all"];
}

function formatSourceType(sourceType: string) {
  if (sourceType.includes("agenda")) {
    return "Agenda";
  }

  if (sourceType.includes("minute")) {
    return "Minutes";
  }

  if (sourceType.includes("recording") || sourceType.includes("transcript")) {
    return "Recording";
  }

  return "Meeting source";
}

function sourceActionLabel(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("transcript")) {
    return "Open transcript";
  }

  if (normalized.includes("recording")) {
    return "Open recording";
  }

  if (normalized.includes("agenda")) {
    return "Open agenda";
  }

  if (normalized.includes("minutes")) {
    return "Open minutes";
  }

  return "Open source";
}

function shouldShowQuote(summary: string, quote: string | null) {
  if (!quote) {
    return false;
  }

  const normalizedSummary = normalizeComparableText(summary);
  const normalizedQuote = normalizeComparableText(quote);

  return (
    normalizedQuote.length > 42 &&
    normalizedQuote !== normalizedSummary &&
    !normalizedSummary.includes(normalizedQuote)
  );
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseSourceTrail(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is SourceTrailItem => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate.label === "string" &&
          typeof candidate.url === "string" &&
          typeof candidate.sourceType === "string"
        );
      })
      .filter(
        (item, index, collection) =>
          collection.findIndex((candidate) => candidate.url === item.url) ===
          index
      );
  } catch {
    return [];
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatTimestamp(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
