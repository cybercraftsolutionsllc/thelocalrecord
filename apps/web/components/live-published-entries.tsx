"use client";

import { useEffect, useState } from "react";

import type { PublicEntry } from "../lib/data";
import { contentApiBase } from "../lib/public-config";
import {
  entryTopicLabels,
  getEntryTopic,
  type EntryTopicKey
} from "../lib/topics";

import { UpdateCard } from "./update-card";

type LivePublishedEntriesProps = {
  slug: string;
  initialEntries: PublicEntry[];
};

type ApiEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  risk_level?: string;
  review_state?: string;
  source_links_json: string;
  extraction_note?: string | null;
  published_at: string;
  source_material_date?: string | null;
  source_name?: string;
  topic_text?: string;
};

type PublishedPayload = {
  entries: ApiEntry[];
  total: number;
  page: number;
  pageSize: number;
};

type TopicOption = {
  key: EntryTopicKey;
  label: string;
  count: number;
};

function normalizePayload(payload: PublishedPayload | ApiEntry[]) {
  if (Array.isArray(payload)) {
    return {
      entries: payload,
      total: payload.length,
      page: 1,
      pageSize: payload.length || 10
    };
  }

  return payload;
}

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
      }))
      .filter((item, index, collection) => {
        return (
          collection.findIndex((candidate) => candidate.url === item.url) ===
          index
        );
      });
  } catch {
    return [];
  }
}

function mapApiEntry(entry: ApiEntry): PublicEntry {
  return {
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    category: entry.category,
    publishedAt: entry.published_at,
    sourceMaterialDate: entry.source_material_date ?? null,
    extractionNote: entry.extraction_note ?? null,
    sourceLabel: entry.source_name ?? "Official township source",
    sourceLinks: parseSourceLinks(entry.source_links_json),
    topicText: entry.topic_text ?? ""
  };
}

export function LivePublishedEntries({
  slug,
  initialEntries
}: LivePublishedEntriesProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialEntries.length);
  const [activeTopic, setActiveTopic] = useState<EntryTopicKey>("all");
  const [query, setQuery] = useState("");
  const pageSize = 18;

  useEffect(() => {
    if (!contentApiBase) {
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus("loading");

      try {
        const response = await fetch(
          `${contentApiBase}/api/localities/${slug}/published?page=${page}&pageSize=${pageSize}`,
          {
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load published entries");
        }

        const payload = normalizePayload(
          (await response.json()) as PublishedPayload | ApiEntry[]
        );
        const nextEntries = payload.entries.map(mapApiEntry);

        if (!cancelled) {
          setEntries((current) => {
            if (page === 1) {
              return nextEntries;
            }

            const existingIds = new Set(current.map((entry) => entry.id));
            return [
              ...current,
              ...nextEntries.filter((entry) => !existingIds.has(entry.id))
            ];
          });
          setTotal(payload.total);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, slug]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const loadedCount = entries.length;
  const normalizedQuery = query.trim().toLowerCase();
  const topicOptions = entries.reduce<TopicOption[]>(
    (options, entry) => {
      const topic = getEntryTopic(entry);
      const existing = options.find((option) => option.key === topic);

      if (existing) {
        existing.count += 1;
      } else {
        options.push({ key: topic, label: entryTopicLabels[topic], count: 1 });
      }

      return options;
    },
    [{ key: "all", label: entryTopicLabels.all, count: entries.length }]
  );
  const filteredEntries = entries.filter((entry) => {
    const matchesTopic =
      activeTopic === "all" || getEntryTopic(entry) === activeTopic;

    if (!matchesTopic) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack =
      `${entry.title} ${entry.summary} ${entry.category} ${entry.sourceLabel}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (entries.length > 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-white/75 bg-white p-5 shadow-card">
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Browse this feed
              </p>
              <p className="text-sm leading-7 text-ink/70">
                Major notices and township updates appear first. Use the filters
                to focus on meetings, planning items, or specific topics.
              </p>
              <p className="text-xs leading-6 text-ink/55">
                Showing {loadedCount} of {total} published entries.
              </p>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <label className="w-full xl:max-w-sm">
                <span className="sr-only">Search updates</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search updates, roads, meetings, ordinances..."
                  className="w-full rounded-full border border-ink/10 bg-sand/50 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss/30 focus:bg-white"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {topicOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveTopic(option.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTopic === option.key
                        ? "bg-moss text-white"
                        : "border border-moss/10 bg-sky/50 text-moss hover:bg-sky"
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {filteredEntries.map((entry) => (
          <UpdateCard key={entry.id} {...entry} />
        ))}
        {filteredEntries.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-ink/15 bg-white p-8 text-ink/70 shadow-card">
            No entries match that filter on this page of results.
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/75 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/70">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTopic("all");
                setQuery("");
                setPage(1);
              }}
              disabled={page === 1}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset view
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || loadedCount >= total}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load more
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-dashed border-ink/15 bg-white p-8 text-ink/70 shadow-card">
      <h3 className="font-serif text-2xl text-moss">
        {status === "loading"
          ? "Loading published entries"
          : "No published entries yet"}
      </h3>
      <p className="mt-3 max-w-2xl leading-7">
        {status === "error"
          ? "The live content API did not respond. The static page shell is still available while data sync is checked."
          : "The source registry is ready and the page is live. Once ingest publishes low-risk updates, they will appear here with source links."}
      </p>
    </div>
  );
}
