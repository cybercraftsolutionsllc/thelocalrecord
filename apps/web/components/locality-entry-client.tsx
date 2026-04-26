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
    <div className="mx-auto max-w-5xl px-6 py-12">
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
        </div>
      ) : null}
    </div>
  );
}
