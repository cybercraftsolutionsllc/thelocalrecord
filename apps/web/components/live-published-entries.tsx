"use client";

import { useCallback, useEffect, useState } from "react";

import type { PublicEntry } from "../lib/data";
import { contentApiBase } from "../lib/public-config";
import {
  entryTopicDisplayOrder,
  entryTopicLabels,
  getEntryTopic,
  type EntryTopicKey
} from "../lib/topics";

import { CommunityBriefing } from "./community-briefing";
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

type SearchPayload = {
  entries: ApiEntry[];
  total: number;
  query: string;
};

type TopicOption = {
  key: EntryTopicKey;
  label: string;
  count: number;
};

type FeedViewKey = "events_of_note" | "all_records";

const quickSearchSuggestions = [
  "Ashford Meadows",
  "Planning Commission",
  "Route 30",
  "Codified code"
];

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

function mapApiEntry(entry: ApiEntry, slug: string): PublicEntry {
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
    detailUrl: `/${slug}/item/?id=${encodeURIComponent(entry.id)}`,
    topicText: entry.topic_text ?? ""
  };
}

export function LivePublishedEntries({
  slug,
  initialEntries
}: LivePublishedEntriesProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [searchEntries, setSearchEntries] = useState<PublicEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialEntries.length);
  const [feedView, setFeedView] = useState<FeedViewKey>("events_of_note");
  const [activeTopic, setActiveTopic] = useState<EntryTopicKey>("all");
  const [query, setQuery] = useState("");
  const pageSize = 18;

  const applySearch = useCallback((nextQuery: string) => {
    setFeedView("all_records");
    setActiveTopic("all");
    setPage(1);
    setQuery(nextQuery);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("q", nextQuery);
      url.hash = "records";
      window.history.replaceState(null, "", url);
    }
  }, []);

  const resetView = useCallback(() => {
    setFeedView("events_of_note");
    setActiveTopic("all");
    setQuery("");
    setPage(1);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      url.hash = "";
      window.history.replaceState(null, "", url);
    }
  }, []);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);

    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery.length >= 3) {
      setFeedView("all_records");
      setActiveTopic("all");
      setPage(1);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("q", trimmedQuery);
        url.hash = "records";
        window.history.replaceState(null, "", url);
      }

      return;
    }

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState(null, "", url);
    }
  }

  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search)
      .get("q")
      ?.trim();

    if (urlQuery) {
      applySearch(urlQuery);
    }
  }, [applySearch]);

  useEffect(() => {
    if (entries.length === 0 || window.location.hash !== "#records") {
      return;
    }

    const timeout = window.setTimeout(() => {
      const recordsElement = document.getElementById("records");

      if (!recordsElement) {
        return;
      }

      window.scrollTo({
        top: recordsElement.getBoundingClientRect().top + window.scrollY - 96,
        behavior: "auto"
      });
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [entries.length, query]);

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
        const nextEntries = payload.entries.map((entry) =>
          mapApiEntry(entry, slug)
        );

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

  useEffect(() => {
    if (!contentApiBase) {
      return;
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      setSearchEntries([]);
      setSearchStatus("idle");
      return;
    }

    let cancelled = false;
    setSearchStatus("loading");

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `${contentApiBase}/api/localities/${slug}/search?q=${encodeURIComponent(trimmedQuery)}&limit=24`,
            {
              cache: "no-store"
            }
          );

          if (!response.ok) {
            throw new Error("Failed to search published entries");
          }

          const payload = (await response.json()) as SearchPayload;
          const nextEntries = payload.entries.map((entry) =>
            mapApiEntry(entry, slug)
          );

          if (!cancelled) {
            setSearchEntries(nextEntries);
            setSearchStatus("ready");
          }
        } catch {
          if (!cancelled) {
            setSearchStatus("error");
          }
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, slug]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const loadedCount = entries.length;
  const normalizedQuery = query.trim().toLowerCase();
  const searchActive = normalizedQuery.length >= 3;
  const visiblePool = searchActive ? searchEntries : entries;
  const notableVisibleEntries = visiblePool.filter(isResidentFacingEntry);
  const unsortedTopicOptions = visiblePool.reduce<TopicOption[]>(
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
    [{ key: "all", label: entryTopicLabels.all, count: visiblePool.length }]
  );
  const topicOptions = entryTopicDisplayOrder
    .map((key) => unsortedTopicOptions.find((option) => option.key === key))
    .filter((option): option is TopicOption =>
      Boolean(option && option.count > 0)
    );
  const baseEntries = searchActive
    ? visiblePool
    : activeTopic !== "all" || feedView === "all_records"
      ? visiblePool
      : notableVisibleEntries;
  const filteredEntries = visiblePool.filter((entry) => {
    if (!baseEntries.some((candidate) => candidate.id === entry.id)) {
      return false;
    }

    const matchesTopic =
      activeTopic === "all" || getEntryTopic(entry) === activeTopic;

    if (!matchesTopic) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack =
      `${entry.title} ${entry.summary} ${entry.category} ${entry.sourceLabel} ${entry.topicText ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (entries.length > 0) {
    return (
      <div id="records" className="space-y-5 scroll-mt-24">
        <CommunityBriefing
          entries={visiblePool}
          total={total}
          status={status}
          searchActive={searchActive}
          onClearSearch={resetView}
          onSearch={applySearch}
        />

        <div className="rounded-[1.5rem] border border-white/75 bg-white p-6 shadow-card">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                  Record workbench
                </p>
                <h2 className="mt-2 font-serif text-[2.15rem] leading-tight text-moss">
                  Search, filter, and open the source trail
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-ink/58">
                Use this when you want the official source behind a project,
                date, ordinance, address, or meeting.
              </p>
            </div>

            <div className="space-y-4 border-t border-ink/8 pt-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <label className="block flex-1">
                  <span className="sr-only">Search updates</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => handleQueryChange(event.target.value)}
                    placeholder="Search Ashford Meadows, roads, meetings, permits..."
                    className="w-full rounded-full border border-ink/10 bg-sand/20 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss/30 focus:bg-white"
                  />
                </label>

                {searchActive ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-clay/20 bg-clay/10 px-4 py-2 text-sm font-semibold text-clay">
                      Searching all records
                    </span>
                    <button
                      type="button"
                      onClick={resetView}
                      className="rounded-full border border-moss/15 bg-white px-4 py-2 text-sm font-semibold text-moss transition hover:bg-sky"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex rounded-full border border-moss/10 bg-sand/25 p-1">
                    <button
                      type="button"
                      onClick={() => setFeedView("events_of_note")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        feedView === "events_of_note"
                          ? "bg-moss text-white shadow-sm"
                          : "text-moss hover:bg-white"
                      }`}
                    >
                      Resident highlights
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedView("all_records")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        feedView === "all_records"
                          ? "bg-moss text-white shadow-sm"
                          : "text-moss hover:bg-white"
                      }`}
                    >
                      All records
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ink/50">Quick searches:</span>
                {quickSearchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => applySearch(suggestion)}
                    className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm text-moss transition hover:bg-sky"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {searchActive ? (
                <p className="text-sm leading-6 text-ink/58">
                  {searchStatus === "loading"
                    ? `Searching the full live record for "${query.trim()}".`
                    : `Showing ${filteredEntries.length} search results for "${query.trim()}".`}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-ink/8 pt-4">
                {topicOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveTopic(option.key)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                      activeTopic === option.key
                        ? "bg-moss text-white"
                        : "border border-ink/10 bg-[#f7f4ec] text-moss hover:bg-sky/65"
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
            {searchActive
              ? searchStatus === "loading"
                ? "Searching the full locality record..."
                : 'No matching records yet. Try a more specific term like "Ashford Meadows", "Planning Commission", or "Route 30".'
              : "No entries match that filter on this page of results."}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/75 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/70">
            {searchActive
              ? searchStatus === "loading"
                ? "Search is running across the full live locality record, not just loaded cards."
                : "Search ran across the full live locality record, not just loaded cards."
              : `Page ${Math.min(page, totalPages)} of ${totalPages}`}
          </p>
          <div className="flex gap-3">
            {searchActive ? (
              <button
                type="button"
                onClick={resetView}
                className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Clear search
              </button>
            ) : activeTopic !== "all" ||
              feedView !== "events_of_note" ||
              page > 1 ? (
              <button
                type="button"
                onClick={resetView}
                className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Reset filters
              </button>
            ) : null}
            {!searchActive && page < totalPages && loadedCount < total ? (
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Load more records
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="records"
      className="scroll-mt-24 rounded-[2rem] border border-dashed border-ink/15 bg-white p-8 text-ink/70 shadow-card"
    >
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

function isResidentFacingEntry(entry: PublicEntry) {
  const topic = getEntryTopic(entry);
  const haystack =
    `${entry.title} ${entry.summary} ${entry.sourceLabel} ${entry.topicText ?? ""}`.toLowerCase();

  if (
    topic === "permits_and_code" &&
    /permit|inspection|fee schedule|code compliance|faq|electrical|plumbing|deck|patio|fireworks|complaints|occupancy|rental housing/.test(
      haystack
    )
  ) {
    return false;
  }

  if (entry.category === "service_notice") {
    return /road|closure|detour|utility|water|trash|trail|park|project|meeting|notice|workshop|survey|alert|traffic/.test(
      haystack
    );
  }

  return true;
}
