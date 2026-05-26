"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { contentApiBase } from "../lib/public-config";

import { UpdateCard } from "./update-card";

type LocalityEntryClientProps = {
  slug: string;
};

type EntryPayload = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source_links_json: string;
  extraction_note?: string | null;
  published_at: string;
  source_material_date?: string | null;
  source_name?: string;
  topic_text?: string;
  meeting_intelligence?: MeetingIntelligence | null;
};

type MeetingIntelligence = {
  meeting_title: string;
  meeting_body: string;
  meeting_date: string | null;
  source_trail_json: string;
  facts: MeetingFact[];
  projects: ProjectEvent[];
};

type MeetingFact = {
  id: string;
  fact_kind: string;
  label: string;
  summary: string;
  quote: string | null;
  source_url: string;
  source_label: string;
  transcript_start_seconds: number | null;
  project_name: string | null;
};

type ProjectEvent = {
  id: string;
  project_name: string;
  event_kind: string;
  summary: string;
  source_url: string;
};

function relabelSourceLink(label: string, url: string, index: number) {
  const lowerLabel = label.toLowerCase();
  const lowerUrl = url.toLowerCase();
  const isDocument =
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes("/documentcenter/view/") ||
    lowerUrl.includes("/archivecenter/viewfile/") ||
    lowerUrl.includes("archive.aspx?adid=");

  if (lowerLabel.includes("source page")) {
    return "Listing page";
  }

  if (lowerLabel.includes("source item")) {
    return isDocument ? "Original document" : "Original post";
  }

  if (index === 0) {
    return isDocument ? "Original document" : "Original post";
  }

  return label;
}

function parseSourceLinks(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is { label: string; url: string } => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate.label === "string" &&
          typeof candidate.url === "string"
        );
      })
      .map((item, index) => ({
        label: relabelSourceLink(item.label, item.url, index),
        url: item.url
      }));
  } catch {
    return [];
  }
}

function trimTopicText(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function LocalityEntryClient({ slug }: LocalityEntryClientProps) {
  const searchParams = useSearchParams();
  const entryId = searchParams.get("id")?.trim() ?? "";
  const [entry, setEntry] = useState<EntryPayload | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );

  useEffect(() => {
    if (!entryId || !contentApiBase) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setStatus("loading");

      try {
        const response = await fetch(
          `${contentApiBase}/api/localities/${slug}/published/${encodeURIComponent(entryId)}`,
          {
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load digest item");
        }

        const payload = (await response.json()) as EntryPayload;

        if (!cancelled) {
          setEntry(payload);
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
  }, [entryId, slug]);

  const sourceText = trimTopicText(entry?.topic_text);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6">
        <Link
          href={`/${slug}`}
          className="inline-flex rounded-md border border-moss/10 bg-white px-4 py-2 text-sm font-semibold text-moss transition hover:bg-sky/50"
        >
          Back to digest
        </Link>
      </div>

      {!entryId ? (
        <div className="rounded-lg border border-ink/10 bg-white p-8">
          This item link is incomplete. Go back to the digest and open the item
          again.
        </div>
      ) : null}

      {entryId && !contentApiBase ? (
        <div className="rounded-lg border border-ink/10 bg-white p-8">
          The live digest API is not available from this build, so this item
          page cannot load yet.
        </div>
      ) : null}

      {entryId && contentApiBase && status === "loading" ? (
        <div className="rounded-lg border border-ink/10 bg-white p-8">
          Loading digest item...
        </div>
      ) : null}

      {entryId && contentApiBase && status === "error" ? (
        <div className="rounded-lg border border-ink/10 bg-white p-8">
          That item could not be loaded right now. Try again in a moment.
        </div>
      ) : null}

      {entry ? (
        <div className="space-y-6">
          <UpdateCard
            title={entry.title}
            summary={entry.summary}
            category={entry.category}
            publishedAt={entry.published_at}
            sourceMaterialDate={entry.source_material_date ?? null}
            sourceLabel={entry.source_name ?? "Official township source"}
            sourceLinks={parseSourceLinks(entry.source_links_json)}
            extractionNote={entry.extraction_note ?? null}
            topicText={entry.topic_text ?? ""}
          />

          {sourceText ? (
            <section className="rounded-lg border border-ink/10 bg-white p-6 sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Source text
              </p>
              <p className="mt-4 text-sm leading-8 text-ink/78">{sourceText}</p>
            </section>
          ) : null}

          {entry.meeting_intelligence ? (
            <MeetingIntelligencePanel
              meetingIntelligence={entry.meeting_intelligence}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MeetingIntelligencePanel({
  meetingIntelligence
}: {
  meetingIntelligence: MeetingIntelligence;
}) {
  const trail = parseSourceTrail(meetingIntelligence.source_trail_json);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6 sm:p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
        Meeting intelligence
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">
        {meetingIntelligence.meeting_body}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink/62">
        Structured facts extracted from the posted meeting record. Open the
        source before acting on any detail.
      </p>

      <div className="mt-5 space-y-3">
        {meetingIntelligence.facts.map((fact) => (
          <article
            key={fact.id}
            className="rounded-md border border-ink/10 bg-sand/45 p-4"
          >
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/50">
              <span className="text-clay">{labelFactKind(fact.fact_kind)}</span>
              {fact.project_name ? <span>{fact.project_name}</span> : null}
              {fact.transcript_start_seconds !== null ? (
                <span>{formatTimestamp(fact.transcript_start_seconds)}</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/74">
              {fact.summary}
            </p>
            {fact.quote ? (
              <p className="mt-3 border-l-2 border-moss/25 pl-3 text-sm leading-6 text-ink/58">
                {fact.quote}
              </p>
            ) : null}
            <a
              href={fact.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-moss underline-offset-4 hover:underline"
            >
              {fact.source_label}
            </a>
          </article>
        ))}
      </div>

      {meetingIntelligence.projects.length > 0 ? (
        <div className="mt-6 border-t border-ink/8 pt-5">
          <p className="text-sm font-semibold text-moss">Project timeline</p>
          <div className="mt-3 space-y-3">
            {meetingIntelligence.projects.map((project) => (
              <article
                key={project.id}
                className="rounded-md border border-ink/10 p-4"
              >
                <p className="text-sm font-semibold text-ink">
                  {project.project_name}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  {project.summary}
                </p>
                <a
                  href={project.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-moss underline-offset-4 hover:underline"
                >
                  Open source
                </a>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {trail.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/8 pt-5">
          {trail.map((source) => (
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
      ) : null}
    </section>
  );
}

function labelFactKind(kind: string) {
  switch (kind) {
    case "decision":
      return "Decision";
    case "project_update":
      return "Project";
    case "public_comment":
      return "Comment";
    case "next_step":
      return "Next step";
    case "condition":
      return "Condition";
    case "recording_reference":
      return "Recording";
    default:
      return "Source fact";
  }
}

function parseSourceTrail(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is { label: string; url: string } => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate.label === "string" &&
          typeof candidate.url === "string"
        );
      }
    );
  } catch {
    return [];
  }
}

function formatTimestamp(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
