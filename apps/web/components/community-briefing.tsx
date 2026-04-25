"use client";

import type { PublicEntry } from "../lib/data";
import {
  entryTopicLabels,
  getEntryTopic,
  type EntryTopicKey
} from "../lib/topics";

type CommunityBriefingProps = {
  entries: PublicEntry[];
  total: number;
  status: "idle" | "loading" | "ready" | "error";
  searchActive: boolean;
  onClearSearch: () => void;
  onSearch: (query: string) => void;
};

type WatchTerm = {
  label: string;
  query: string;
  patterns: string[];
};

const watchTerms: WatchTerm[] = [
  {
    label: "Ashford Meadows",
    query: "Ashford Meadows",
    patterns: ["ashford meadows", "kreider avenue", "lititz pike"]
  },
  {
    label: "Route 30 / 222",
    query: "Route 30",
    patterns: ["route 30", "route30", "route 222", "222 interchange"]
  },
  {
    label: "Parks through 2035",
    query: "parks 2035",
    patterns: ["park", "parks", "recreation", "stauffer", "overlook"]
  },
  {
    label: "Library board",
    query: "library board",
    patterns: ["library board", "ordinance 2026-07"]
  },
  {
    label: "Permits and code",
    query: "permit",
    patterns: ["permit", "code compliance", "inspection", "occupancy"]
  },
  {
    label: "Zoning hearings",
    query: "zoning hearing",
    patterns: ["zoning hearing", "variance", "conditional use"]
  }
];

const priorityTopics: EntryTopicKey[] = [
  "housing_and_growth",
  "land_development",
  "alerts_and_closures",
  "events_and_meetings"
];

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function entryText(entry: PublicEntry) {
  return compactText(
    `${entry.title} ${entry.summary} ${entry.category} ${entry.sourceLabel} ${entry.topicText ?? ""}`
  ).toLowerCase();
}

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);

  if (!date) {
    return "Date unavailable";
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

function getMostRecent(entries: PublicEntry[]) {
  return entries
    .map((entry) => ({
      entry,
      date: parseDate(entry.sourceMaterialDate ?? entry.publishedAt)
    }))
    .filter((item): item is { entry: PublicEntry; date: Date } =>
      Boolean(item.date)
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.entry;
}

function getUpcoming(entries: PublicEntry[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return entries
    .map((entry) => ({
      entry,
      date: parseDate(entry.sourceMaterialDate)
    }))
    .filter((item): item is { entry: PublicEntry; date: Date } =>
      Boolean(item.date && item.date.getTime() >= now.getTime())
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);
}

function countMatchingEntries(entries: PublicEntry[], term: WatchTerm) {
  return entries.filter((entry) => {
    const haystack = entryText(entry);
    return term.patterns.some((pattern) => haystack.includes(pattern));
  }).length;
}

function getTopicCounts(entries: PublicEntry[]) {
  return priorityTopics
    .map((topic) => ({
      topic,
      label: entryTopicLabels[topic],
      count: entries.filter((entry) => getEntryTopic(entry) === topic).length
    }))
    .filter((item) => item.count > 0);
}

function getSourceCounts(entries: PublicEntry[]) {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    counts.set(entry.sourceLabel, (counts.get(entry.sourceLabel) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export function CommunityBriefing({
  entries,
  total,
  status,
  onClearSearch,
  searchActive,
  onSearch
}: CommunityBriefingProps) {
  const mostRecent = getMostRecent(entries);
  const upcoming = getUpcoming(entries);
  const sourceCounts = getSourceCounts(entries);
  const topicCounts = getTopicCounts(entries);
  const sourceTotal = new Set(entries.map((entry) => entry.sourceLabel)).size;
  const maxSourceCount = Math.max(
    1,
    ...sourceCounts.map((source) => source.count)
  );
  const maxTopicCount = Math.max(1, ...topicCounts.map((topic) => topic.count));

  return (
    <section className="rounded-[1.5rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Civic briefing
              </p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-moss">
                What residents can use right now
              </h2>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 text-center 2xl:max-w-md">
              <div className="rounded-[0.85rem] border border-ink/10 bg-sand/35 px-3 py-2">
                <p className="font-serif text-2xl leading-none text-moss">
                  {total || entries.length}
                </p>
                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink/45">
                  Records
                </p>
              </div>
              <div className="rounded-[0.85rem] border border-ink/10 bg-sand/35 px-3 py-2">
                <p className="font-serif text-2xl leading-none text-moss">
                  {sourceTotal}
                </p>
                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink/45">
                  Sources
                </p>
              </div>
              <div className="rounded-[0.85rem] border border-ink/10 bg-sand/35 px-3 py-2">
                <p className="font-serif text-2xl leading-none text-moss">
                  {upcoming.length}
                </p>
                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink/45">
                  Upcoming
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1rem] border border-moss/10 bg-[#f9f7f0] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                Latest useful record
              </p>
              <h3 className="mt-2 text-base font-semibold leading-6 text-moss">
                {mostRecent?.title ?? "Waiting on the live feed"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/62">
                {mostRecent
                  ? `${formatDate(mostRecent.sourceMaterialDate ?? mostRecent.publishedAt)} from ${mostRecent.sourceLabel}`
                  : status === "loading"
                    ? "Loading source-linked records."
                    : "The static shell is available while live records load."}
              </p>
            </div>

            <div className="rounded-[1rem] border border-moss/10 bg-[#f9f7f0] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                Next on the calendar
              </p>
              {upcoming[0] ? (
                <>
                  <h3 className="mt-2 text-base font-semibold leading-6 text-moss">
                    {upcoming[0].entry.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink/62">
                    {formatDate(upcoming[0].entry.sourceMaterialDate)} via{" "}
                    {upcoming[0].entry.sourceLabel}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink/62">
                  No upcoming dated items are loaded in this view yet.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
              Watchlist searches
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {watchTerms.map((term) => {
                const count = countMatchingEntries(entries, term);

                return (
                  <button
                    key={term.label}
                    type="button"
                    onClick={() => onSearch(term.query)}
                    className="rounded-full border border-moss/10 bg-white px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky"
                  >
                    Search {term.label}
                    <span className="ml-1 font-normal text-ink/45">
                      {count} loaded
                    </span>
                  </button>
                );
              })}
            </div>
            {searchActive ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="mt-3 text-sm font-semibold text-moss underline-offset-4 hover:underline"
              >
                Clear search and return to the main briefing
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.25rem] border border-ink/10 bg-sand/25 p-4">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                Topic pulse
              </p>
              <span className="text-xs text-ink/45">
                {searchActive ? "Search view" : "Loaded view"}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {topicCounts.map((topic) => (
                <div key={topic.topic}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-moss">
                      {topic.label}
                    </span>
                    <span className="text-ink/55">{topic.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-clay"
                      style={{
                        width: `${Math.max(10, (topic.count / maxTopicCount) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
              {topicCounts.length === 0 ? (
                <p className="text-sm leading-6 text-ink/62">
                  Topic counts will appear after records load.
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-ink/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
              Source pulse
            </p>
            <div className="mt-3 space-y-3">
              {sourceCounts.map((source) => (
                <div key={source.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-moss">
                      {source.label}
                    </span>
                    <span className="text-ink/55">{source.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-moss"
                      style={{
                        width: `${Math.max(10, (source.count / maxSourceCount) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
              {sourceCounts.length === 0 ? (
                <p className="text-sm leading-6 text-ink/62">
                  Source counts will appear after records load.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
