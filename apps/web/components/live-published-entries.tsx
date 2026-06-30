"use client";

import { useCallback, useEffect, useState } from "react";

import type { PublicEntry } from "../lib/data";
import { contentApiBase } from "../lib/public-config";
import {
  buildRecordSignal,
  getResidentLane,
  isImportantEntry,
  residentLaneLabels,
  residentLaneOrder,
  type ResidentLaneKey
} from "../lib/record-signals";

import { CommunityBriefing } from "./community-briefing";
import { UpdateCard } from "./update-card";

type LivePublishedEntriesProps = {
  slug: string;
  municipalityName: string;
  initialEntries: PublicEntry[];
  trackedSources?: Array<{
    name: string;
    publicCategory: string;
    url: string;
  }>;
};

type ApiEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  impact_level?: string;
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

type LaneOption = {
  key: ResidentLaneKey;
  label: string;
  count: number;
};

type FeedViewKey = "events_of_note" | "all_records";

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
    impactLevel: entry.impact_level ?? "routine",
    publishedAt: entry.published_at,
    sourceMaterialDate: entry.source_material_date ?? null,
    extractionNote: entry.extraction_note ?? null,
    sourceLabel: entry.source_name ?? "Official township source",
    sourceLinks: parseSourceLinks(entry.source_links_json),
    detailUrl: `/${slug}/item/?id=${encodeURIComponent(entry.id)}`,
    topicText: entry.topic_text ?? ""
  };
}

function parseEntryDate(entry: PublicEntry) {
  const date = new Date(entry.sourceMaterialDate ?? entry.publishedAt);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getRecentEntries(entries: PublicEntry[]) {
  return entries
    .map((entry) => ({
      entry,
      date: parseEntryDate(entry)
    }))
    .filter((item): item is { entry: PublicEntry; date: Date } =>
      Boolean(item.date)
    )
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .map((item) => item.entry);
}

export function LivePublishedEntries({
  slug,
  municipalityName,
  initialEntries,
  trackedSources = []
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
  const [searchTotal, setSearchTotal] = useState(0);
  const [feedView, setFeedView] = useState<FeedViewKey>("events_of_note");
  const [activeLane, setActiveLane] = useState<ResidentLaneKey>("all");
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(4);
  const pageSize = 18;

  const applySearch = useCallback((nextQuery: string) => {
    setFeedView("all_records");
    setActiveLane("all");
    setPage(1);
    setVisibleLimit(4);
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
    setActiveLane("all");
    setQuery("");
    setPage(1);
    setVisibleLimit(4);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      url.hash = "";
      window.history.replaceState(null, "", url);
    }
  }, []);

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
      setSearchTotal(0);
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
            setSearchTotal(payload.total);
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

  useEffect(() => {
    setVisibleLimit(4);
  }, [activeLane, feedView, query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const loadedCount = entries.length;
  const normalizedQuery = query.trim().toLowerCase();
  const searchActive = normalizedQuery.length >= 3;
  const visiblePool = searchActive ? searchEntries : entries;
  const notableVisibleEntries = visiblePool.filter(isResidentFacingEntry);
  const unsortedLaneOptions = visiblePool.reduce<LaneOption[]>(
    (options, entry) => {
      const lane = getResidentLane(entry);
      const existing = options.find((option) => option.key === lane);

      if (existing) {
        existing.count += 1;
      } else {
        options.push({ key: lane, label: residentLaneLabels[lane], count: 1 });
      }

      return options;
    },
    [{ key: "all", label: residentLaneLabels.all, count: visiblePool.length }]
  );
  const laneOptions = residentLaneOrder
    .map((key) => unsortedLaneOptions.find((option) => option.key === key))
    .filter((option): option is LaneOption =>
      Boolean(option && option.count > 0)
    );
  const baseEntries = searchActive
    ? visiblePool
    : activeLane !== "all" || feedView === "all_records"
      ? visiblePool
      : notableVisibleEntries;
  const filteredEntries = visiblePool.filter((entry) => {
    if (!baseEntries.some((candidate) => candidate.id === entry.id)) {
      return false;
    }

    const matchesLane =
      activeLane === "all" || getResidentLane(entry) === activeLane;

    if (!matchesLane) {
      return false;
    }

    if (!normalizedQuery || searchActive) {
      return true;
    }

    const haystack =
      `${entry.title} ${entry.summary} ${entry.category} ${entry.sourceLabel} ${entry.topicText ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const recentVisibleEntries = searchActive
    ? visiblePool
    : getRecentEntries(visiblePool);
  const featuredEntry = searchActive
    ? visiblePool[0]
    : (recentVisibleEntries.find(isImportantEntry) ?? recentVisibleEntries[0]);
  const displayEntries = filteredEntries.filter(
    (entry) => entry.id !== featuredEntry?.id
  );
  const visibleDisplayEntries = displayEntries.slice(0, visibleLimit);
  const remainingDisplayCount = Math.max(
    0,
    displayEntries.length - visibleDisplayEntries.length
  );
  const hasAnyResult = Boolean(featuredEntry) || filteredEntries.length > 0;

  if (entries.length > 0) {
    return (
      <div id="records" className="space-y-5 scroll-mt-24">
        <CommunityBriefing
          municipalityName={municipalityName}
          featuredEntry={featuredEntry}
          trackedSources={trackedSources}
          total={searchActive ? searchTotal : total}
          filteredCount={filteredEntries.length}
          status={searchActive ? searchStatus : status}
          searchActive={searchActive}
          query={query}
          laneOptions={laneOptions}
          activeLane={activeLane}
          feedView={feedView}
          onClearSearch={resetView}
          onSearch={applySearch}
          onSelectLane={setActiveLane}
          onSelectFeedView={setFeedView}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-moss">
              {searchActive ? "Other matches" : "Also watch"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
              {searchActive
                ? `Records related to "${query.trim()}"`
                : feedView === "events_of_note"
                  ? "More important records"
                  : "More local records"}
            </h2>
          </div>
          <p className="text-sm leading-6 text-ink/58">
            {searchActive
              ? searchStatus === "loading"
                ? "Searching the full live record."
                : `${filteredEntries.length} match${
                    filteredEntries.length === 1 ? "" : "es"
                  }.`
              : `${filteredEntries.length} in this view.`}
          </p>
        </div>

        <div className="space-y-3">
          {visibleDisplayEntries.map((entry) => (
            <UpdateCard key={entry.id} {...entry} />
          ))}
        </div>

        {!hasAnyResult ? (
          <div className="rounded-xl border border-dashed border-ink/15 bg-white p-5 text-sm leading-6 text-ink/64">
            {searchActive
              ? searchStatus === "loading"
                ? "Searching the full locality record..."
                : "No matching records yet. Try a nearby street, project name, road number, board, or park."
              : "No entries match that filter on this page of results."}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white px-5 py-4">
          <p className="text-sm text-ink/70">
            {searchActive
              ? searchStatus === "loading"
                ? "Searching every live record."
                : "Search checked the full live record."
              : `Page ${Math.min(page, totalPages)} of ${totalPages}`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {remainingDisplayCount > 0 ? (
              <button
                type="button"
                onClick={() => setVisibleLimit((current) => current + 4)}
                className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-moss"
              >
                Show {Math.min(4, remainingDisplayCount)} more
              </button>
            ) : null}
            {searchActive ? (
              <button
                type="button"
                onClick={resetView}
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/72 transition hover:bg-sky/55 hover:text-ink"
              >
                Clear search
              </button>
            ) : activeLane !== "all" ||
              feedView !== "events_of_note" ||
              page > 1 ? (
              <button
                type="button"
                onClick={resetView}
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/72 transition hover:bg-sky/55 hover:text-ink"
              >
                Reset filters
              </button>
            ) : null}
            {!searchActive &&
            remainingDisplayCount === 0 &&
            page < totalPages &&
            loadedCount < total ? (
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/72 transition hover:bg-sky/55 hover:text-ink"
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
      className="scroll-mt-24 rounded-lg border border-dashed border-ink/15 bg-white p-5 text-ink/64"
    >
      <h3 className="text-2xl font-semibold tracking-tight text-ink">
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
  const signal = buildRecordSignal(entry);
  const lane = getResidentLane(entry);
  const haystack =
    `${entry.title} ${entry.summary} ${entry.sourceLabel} ${entry.topicText ?? ""}`.toLowerCase();

  if (entry.category === "agenda_posted" || entry.category === "approved_minutes") {
    return false;
  }

  if (
    lane === "permits" &&
    /permit|inspection|fee schedule|code compliance|faq|electrical|plumbing|deck|patio|fireworks|complaints|occupancy|rental housing/.test(
      haystack
    )
  ) {
    return false;
  }

  if (signal.important) {
    return true;
  }

  if (entry.category === "service_notice") {
    return /road|closure|detour|utility|water|trash|trail|park|project|meeting|notice|workshop|survey|alert|traffic/.test(
      haystack
    );
  }

  return true;
}
