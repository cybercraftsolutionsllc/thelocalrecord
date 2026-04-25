"use client";

import { useEffect, useMemo, useState } from "react";

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
  query: string;
  onClearSearch: () => void;
  onSearch: (query: string) => void;
};

type QuickCheck = {
  label: string;
  query: string;
  helper: string;
  patterns: string[];
};

type TopicCount = {
  topic: EntryTopicKey;
  label: string;
  count: number;
};

const quickChecks: QuickCheck[] = [
  {
    label: "My street or address",
    query: "605 Granite Run Drive",
    helper: "Try a street, address, park, or intersection.",
    patterns: ["granite run", "address", "street", "drive", "road"]
  },
  {
    label: "New development",
    query: "Ashford Meadows",
    helper: "Planning records, agendas, notices, and source docs.",
    patterns: ["ashford meadows", "development", "subdivision", "land development"]
  },
  {
    label: "Road work",
    query: "Route 30",
    helper: "Closures, detours, traffic projects, and alerts.",
    patterns: ["route 30", "route30", "route 222", "detour", "closure"]
  },
  {
    label: "Meetings",
    query: "Planning Commission",
    helper: "Agendas, minutes, board notices, and next dates.",
    patterns: ["agenda", "minutes", "commission", "board", "meeting"]
  },
  {
    label: "Permits and code",
    query: "permit",
    helper: "Code, inspection, zoning, and resident permit material.",
    patterns: ["permit", "code", "inspection", "occupancy", "zoning"]
  },
  {
    label: "Parks and programs",
    query: "parks 2035",
    helper: "Parks, trails, recreation plans, and event notices.",
    patterns: ["park", "parks", "trail", "recreation", "overlook", "stauffer"]
  }
];

const priorityTopics: EntryTopicKey[] = [
  "housing_and_growth",
  "land_development",
  "alerts_and_closures",
  "events_and_meetings",
  "permits_and_code"
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

function countMatchingEntries(entries: PublicEntry[], check: QuickCheck) {
  return entries.filter((entry) => {
    const haystack = entryText(entry);
    return check.patterns.some((pattern) => haystack.includes(pattern));
  }).length;
}

function getTopicCounts(entries: PublicEntry[]): TopicCount[] {
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

function getImpactLabel(entries: PublicEntry[]) {
  const haystack = entries.map(entryText).join(" ");

  if (/closure|detour|traffic|route|road|bridge|alert/.test(haystack)) {
    return "Travel or service impact";
  }

  if (/ordinance|hearing|notice|board|commission|agenda|meeting/.test(haystack)) {
    return "Public meeting or decision";
  }

  if (/permit|code|zoning|inspection|occupancy|variance/.test(haystack)) {
    return "Property rules or permits";
  }

  if (/park|trail|recreation|program|festival|volunteer/.test(haystack)) {
    return "Community event or amenity";
  }

  return "Local record matches";
}

function getNextAction(entries: PublicEntry[], searchActive: boolean) {
  if (!searchActive) {
    return "Search an address, street, project, road, park, or meeting.";
  }

  if (entries.length === 0) {
    return "Try a nearby street, project name, board name, or road number.";
  }

  const haystack = entries.map(entryText).join(" ");

  if (/agenda|hearing|ordinance|commission|board|meeting/.test(haystack)) {
    return "Open the newest record, then check the official agenda or notice.";
  }

  if (/closure|detour|traffic|route|road/.test(haystack)) {
    return "Check the latest source link before planning travel.";
  }

  if (/permit|code|zoning|inspection|occupancy/.test(haystack)) {
    return "Use this as a pointer, then verify the official code or permit source.";
  }

  return "Open the source trail before making decisions.";
}

function getSearchSummary(
  entries: PublicEntry[],
  total: number,
  status: CommunityBriefingProps["status"],
  searchActive: boolean,
  query: string
) {
  if (!searchActive) {
    return "Start with a property, street, project, road, park, or board name.";
  }

  if (status === "loading") {
    return `Checking the live locality record for "${query}".`;
  }

  if (entries.length === 0) {
    return `No exact loaded matches yet for "${query}".`;
  }

  const label = total === 1 ? "record" : "records";
  return `${total} ${label} found for "${query}".`;
}

export function CommunityBriefing({
  entries,
  total,
  status,
  onClearSearch,
  searchActive,
  query,
  onSearch
}: CommunityBriefingProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const mostRecent = getMostRecent(entries);
  const upcoming = getUpcoming(entries);
  const sourceCounts = getSourceCounts(entries);
  const topicCounts = getTopicCounts(entries);
  const sourceTotal = new Set(entries.map((entry) => entry.sourceLabel)).size;
  const maxTopicCount = Math.max(1, ...topicCounts.map((topic) => topic.count));
  const exactQuery = query.trim();
  const leadingMatches = entries.slice(0, 3);
  const searchSummary = getSearchSummary(
    entries,
    total,
    status,
    searchActive,
    exactQuery
  );
  const strongestSource = sourceCounts[0]?.label ?? "Source links";

  const quickCheckCounts = useMemo(
    () =>
      quickChecks.map((check) => ({
        ...check,
        count: countMatchingEntries(entries, check)
      })),
    [entries]
  );

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  function submitLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draftQuery.trim();

    if (trimmed.length >= 3) {
      onSearch(trimmed);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/75 bg-white shadow-card">
      <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-[#183f47] px-5 py-6 text-white sm:px-6 lg:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#aee4ef]">
            Resident lookup
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.02] text-white sm:text-[2.8rem]">
            What is happening near my property?
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
            Enter an address, street, project, road, park, or meeting name. The
            search scans local records and points you to the source trail.
          </p>

          <form className="mt-6 space-y-3" onSubmit={submitLookup}>
            <label className="block">
              <span className="sr-only">Check a property or local topic</span>
              <input
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Address, street, project, road, park..."
                className="w-full rounded-[1rem] border border-white/16 bg-white px-4 py-4 text-base text-ink outline-none transition placeholder:text-ink/42 focus:border-[#f5c76b] focus:ring-4 focus:ring-[#f5c76b]/20"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={draftQuery.trim().length < 3}
                className="rounded-[0.9rem] bg-[#f5c76b] px-5 py-3 text-sm font-bold text-[#173238] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                Check local record
              </button>
              {searchActive ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="rounded-[0.9rem] border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
                >
                  Clear scan
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 grid gap-2">
            {quickCheckCounts.slice(0, 4).map((check) => (
              <button
                key={check.label}
                type="button"
                onClick={() => onSearch(check.query)}
                className="grid gap-1 rounded-[1rem] border border-white/12 bg-white/8 px-4 py-3 text-left transition hover:bg-white/14"
              >
                <span className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
                  <span>{check.label}</span>
                  <span className="text-xs text-[#aee4ef]">
                    {check.count} loaded
                  </span>
                </span>
                <span className="text-xs leading-5 text-white/62">
                  {check.helper}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6 lg:p-7">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Instant local scan
              </p>
              <h3 className="mt-2 font-serif text-3xl leading-tight text-moss">
                {searchActive ? searchSummary : "Know what is up before you act"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink/68">
                {searchActive
                  ? getNextAction(entries, searchActive)
                  : "The fastest path is a specific place. Search your street, a development name, a road, or the board handling the item."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[0.85rem] border border-ink/10 bg-[#f7f4ec] px-3 py-3">
                <p className="font-serif text-2xl leading-none text-moss">
                  {total || entries.length}
                </p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink/45">
                  Records
                </p>
              </div>
              <div className="rounded-[0.85rem] border border-ink/10 bg-[#f7f4ec] px-3 py-3">
                <p className="font-serif text-2xl leading-none text-moss">
                  {sourceTotal}
                </p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink/45">
                  Sources
                </p>
              </div>
              <div className="rounded-[0.85rem] border border-ink/10 bg-[#f7f4ec] px-3 py-3">
                <p className="font-serif text-2xl leading-none text-moss">
                  {upcoming.length}
                </p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink/45">
                  Dates
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-moss/10 bg-[#f9f7f0] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
                Likely impact
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-moss">
                {getImpactLabel(entries)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-moss/10 bg-[#f9f7f0] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
                Latest source
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-moss">
                {mostRecent
                  ? `${formatDate(mostRecent.sourceMaterialDate ?? mostRecent.publishedAt)}`
                  : "Loading"}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                {mostRecent?.sourceLabel ?? "Waiting for records"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-moss/10 bg-[#f9f7f0] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
                Best place to verify
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-moss">
                {strongestSource}
              </p>
            </div>
          </div>

          {searchActive ? (
            <div className="rounded-[1.25rem] border border-[#183f47]/10 bg-[#eef7f9] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#183f47]">
                  Top matches
                </p>
                <a
                  href="#record-results"
                  className="text-xs font-semibold text-[#183f47] underline-offset-4 hover:underline"
                >
                  Jump to results
                </a>
              </div>
              <div className="mt-3 grid gap-2">
                {leadingMatches.map((entry) => (
                  <a
                    key={entry.id}
                    href={entry.detailUrl ?? "#record-results"}
                    className="rounded-[0.9rem] border border-white bg-white px-3 py-3 transition hover:border-[#183f47]/20"
                  >
                    <span className="block text-sm font-semibold leading-5 text-moss">
                      {entry.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ink/58">
                      {formatDate(entry.sourceMaterialDate ?? entry.publishedAt)} via{" "}
                      {entry.sourceLabel}
                    </span>
                  </a>
                ))}
                {leadingMatches.length === 0 ? (
                  <p className="text-sm leading-6 text-ink/62">
                    {status === "loading"
                      ? "Searching live records now."
                      : "No top matches yet. Try a nearby street, project name, or board."}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-ink/10 bg-sand/25 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
                    Latest useful record
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-moss">
                    {mostRecent?.title ?? "Waiting on the live feed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
                    Next dated item
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-moss">
                    {upcoming[0]
                      ? `${formatDate(upcoming[0].entry.sourceMaterialDate)} - ${upcoming[0].entry.title}`
                      : "No upcoming dated items loaded"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 border-t border-ink/8 pt-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                Topic pulse
              </p>
              <div className="mt-3 space-y-3">
                {topicCounts.map((topic) => (
                  <div key={topic.topic}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-moss">
                        {topic.label}
                      </span>
                      <span className="text-ink/55">{topic.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sand">
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                Source pulse
              </p>
              <div className="mt-3 grid gap-2">
                {sourceCounts.map((source) => (
                  <div
                    key={source.label}
                    className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-ink/8 bg-[#f9f7f0] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-moss">
                      {source.label}
                    </span>
                    <span className="text-ink/55">{source.count}</span>
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
      </div>
    </section>
  );
}
