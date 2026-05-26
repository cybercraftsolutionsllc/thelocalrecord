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

  useEffect(() => {
    if (!contentApiBase) {
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      try {
        const response = await fetch(
          `${contentApiBase}/api/localities/${slug}/meetings?limit=6`,
          {
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load meeting intelligence");
        }

        const payload = (await response.json()) as MeetingsPayload;

        if (!cancelled) {
          setMeetings(payload.meetings ?? []);
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

  const topFacts = useMemo(
    () =>
      meetings
        .flatMap((meeting) => meeting.facts)
        .filter((fact) => fact.fact_kind !== "recording_reference")
        .slice(0, 6),
    [meetings]
  );
  const topProjects = useMemo(
    () =>
      meetings
        .flatMap((meeting) => meeting.projects)
        .filter(
          (project, index, collection) =>
            collection.findIndex(
              (candidate) => candidate.project_name === project.project_name
            ) === index
        )
        .slice(0, 4),
    [meetings]
  );

  if (status === "error") {
    return null;
  }

  return (
    <section
      id="meeting-intelligence"
      className="rounded-lg border border-ink/10 bg-white p-5"
    >
      <div className="border-b border-ink/8 pb-5">
        <p className="text-sm font-semibold text-moss">Meeting intelligence</p>
        <h2 className="mt-1 font-serif text-3xl leading-tight text-ink">
          Key items from posted minutes
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/62">
          Briefs group the project, action, vote, conditions, and follow-up
          source so procedural motions stay attached to what they affected.
        </p>
      </div>

      {status === "loading" || status === "idle" ? (
        <p className="py-5 text-sm leading-6 text-ink/62">
          Loading meeting records...
        </p>
      ) : null}

      {status === "ready" && meetings.length === 0 ? (
        <p className="py-5 text-sm leading-6 text-ink/62">
          No structured meeting facts are available yet. Posted records still
          appear in the local record below.
        </p>
      ) : null}

      {meetings.length > 0 ? (
        <div className="space-y-5 pt-5">
          {topFacts.length > 0 ? (
            <div className="space-y-3">
              {topFacts.map((fact) => (
                <FactRow key={fact.id} fact={fact} />
              ))}
            </div>
          ) : null}

          {topProjects.length > 0 ? (
            <div className="border-t border-ink/8 pt-5">
              <p className="text-sm font-semibold text-moss">
                Projects to watch
              </p>
              <div className="mt-3 space-y-3">
                {topProjects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-ink/8 pt-5">
            <p className="text-sm font-semibold text-moss">Latest meetings</p>
            <div className="mt-3 divide-y divide-ink/8">
              {meetings.map((meeting) => (
                <MeetingRow key={meeting.id} slug={slug} meeting={meeting} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FactRow({ fact }: { fact: MeetingFact }) {
  const quote = shouldShowQuote(fact.summary, fact.quote) ? fact.quote : null;

  return (
    <article className="rounded-md border border-ink/10 bg-sand/45 p-4">
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/50">
        <span className="text-clay">
          {factLabels[fact.fact_kind] ?? "Source fact"}
        </span>
        {fact.transcript_start_seconds !== null ? (
          <span>{formatTimestamp(fact.transcript_start_seconds)}</span>
        ) : null}
      </div>
      <h3 className="mt-2 text-base font-semibold leading-6 text-ink">
        {fact.project_name ?? fact.label}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink/74">{fact.summary}</p>
      {quote ? (
        <div className="mt-3 border-l-2 border-moss/25 pl-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/42">
            Source excerpt
          </p>
          <p className="mt-1 text-sm leading-6 text-ink/58">{quote}</p>
        </div>
      ) : null}
      <a
        href={fact.source_url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex text-sm font-semibold text-moss underline-offset-4 hover:underline"
      >
        {sourceActionLabel(fact.source_label)}
      </a>
    </article>
  );
}

function ProjectRow({ project }: { project: ProjectEvent }) {
  return (
    <article className="rounded-md border border-ink/10 p-4">
      <p className="text-sm font-semibold text-ink">{project.project_name}</p>
      <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
      <a
        href={project.source_url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex text-sm font-semibold text-moss underline-offset-4 hover:underline"
      >
        Open source record
      </a>
    </article>
  );
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
    return "Open posted agenda";
  }

  if (normalized.includes("minutes")) {
    return "Open posted minutes";
  }

  return "Open official source";
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

function MeetingRow({
  slug,
  meeting
}: {
  slug: string;
  meeting: MeetingRecord;
}) {
  const trail = parseSourceTrail(meeting.source_trail_json);

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-ink/50">
        <span>{formatDate(meeting.meeting_date ?? meeting.posted_at)}</span>
        <span>{meeting.meeting_body}</span>
        <span>{meeting.facts.length} facts</span>
      </div>
      <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">
        {meeting.meeting_title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/${slug}/item/?id=${encodeURIComponent(meeting.content_entry_id)}`}
          className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Open record
        </a>
        {trail.slice(0, 3).map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
          >
            {source.label}
          </a>
        ))}
      </div>
    </article>
  );
}

function parseSourceTrail(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is SourceTrailItem => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.label === "string" &&
        typeof candidate.url === "string" &&
        typeof candidate.sourceType === "string"
      );
    });
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
