"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { PublicEntry } from "../lib/data";
import {
  buildRecordSignal,
  formatRecordDate,
  getResidentLane,
  residentLaneLabels,
  type ResidentLaneKey
} from "../lib/record-signals";

type TrackedSource = {
  name: string;
  publicCategory: string;
  url: string;
};

type CommunityBriefingProps = {
  entries: PublicEntry[];
  trackedSources: TrackedSource[];
  total: number;
  status: "idle" | "loading" | "ready" | "error";
  searchActive: boolean;
  query: string;
  onClearSearch: () => void;
  onSearch: (query: string) => void;
};

const quickChecks = [
  "Line painting",
  "Butter Road",
  "Ordinance 2026-11",
  "High Meadow",
  "Planning Commission"
];

const featuredLaneOrder: ResidentLaneKey[] = [
  "roads",
  "hearings",
  "money",
  "growth",
  "parks",
  "permits",
  "meetings",
  "general"
];

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  return formatRecordDate(value);
}

function getRecentEntries(entries: PublicEntry[]) {
  return entries
    .map((entry) => ({
      entry,
      date: parseDate(entry.sourceMaterialDate ?? entry.publishedAt)
    }))
    .filter((item): item is { entry: PublicEntry; date: Date } =>
      Boolean(item.date)
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((item) => item.entry);
}

export function CommunityBriefing({
  entries,
  trackedSources,
  total,
  status,
  onClearSearch,
  searchActive,
  query,
  onSearch
}: CommunityBriefingProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const sourceLanes = useMemo(
    () =>
      Array.from(
        new Set(trackedSources.map((source) => source.publicCategory))
      ).sort(),
    [trackedSources]
  );
  const recentEntries = useMemo(() => getRecentEntries(entries), [entries]);
  const featuredEntry = useMemo(
    () =>
      searchActive
        ? entries[0]
        : (recentEntries.find(
            (entry) =>
              entry.impactLevel === "critical_source" ||
              entry.impactLevel === "important"
          ) ?? recentEntries[0]),
    [entries, recentEntries, searchActive]
  );
  const latestEntries = (searchActive ? entries : recentEntries)
    .filter((entry) => entry.id !== featuredEntry?.id)
    .slice(0, 4);
  const mostRecent = recentEntries[0];
  const laneCounts = useMemo(
    () =>
      featuredLaneOrder
        .map((lane) => ({
          lane,
          label: residentLaneLabels[lane],
          count: entries.filter((entry) => getResidentLane(entry) === lane)
            .length
        }))
        .filter((item) => item.count > 0),
    [entries]
  );

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draftQuery.trim();

    if (trimmed.length >= 3) {
      onSearch(trimmed);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-card">
      <div className="relative overflow-hidden bg-ink px-5 py-6 text-white sm:px-6 sm:py-7">
        <img
          src="/images/manheim-hero.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-28"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/86 to-ink/58" />
        <div className="relative">
          <p className="text-sm font-semibold text-sky">
            {searchActive ? "Search brief" : "Resident brief"}
          </p>
          <h2 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-white sm:text-5xl">
            {searchActive ? `What the record says about "${query}"` : "What matters right now"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/76">
            Source-linked local information, organized by what residents can do:
            travel, show up, comment, watch, or open the official record.
          </p>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <Metric
              label={searchActive ? "Matches" : "Published records"}
              value={status === "loading" ? "..." : total || entries.length}
              inverted
            />
            <Metric
              label="Latest source date"
              value={
                mostRecent
                  ? formatDate(mostRecent.sourceMaterialDate ?? mostRecent.publishedAt)
                  : "None"
              }
              inverted
            />
            <Metric
              label="Issue lanes in view"
              value={laneCounts.length || "..."}
              inverted
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold text-moss">Search this locality</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Use a street, project, route, ordinance number, park, or plain
            question fragment.
          </p>
          <form className="mt-3 space-y-3" onSubmit={submitLookup}>
          <label className="block">
            <span className="sr-only">Search local records</span>
            <input
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Address, street, project, road, park..."
              className="h-12 w-full rounded-lg border border-ink/15 bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink/38 focus:border-moss"
            />
          </label>
            <button
              type="submit"
              disabled={draftQuery.trim().length < 3}
              className="h-12 w-full rounded-lg bg-moss px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Search
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {quickChecks.map((check) => (
              <button
                key={check}
                type="button"
                onClick={() => onSearch(check)}
                className="rounded-md border border-ink/10 px-3 py-2 text-ink/68 transition hover:border-moss/25 hover:text-moss"
              >
                {check}
              </button>
            ))}
            {searchActive ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="rounded-md border border-ink/10 px-3 py-2 font-semibold text-moss transition hover:bg-sky/45"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {featuredEntry ? (
          <FeaturedEntry entry={featuredEntry} searchActive={searchActive} />
        ) : (
          <p className="rounded-md border border-dashed border-ink/15 px-4 py-3 text-sm leading-6 text-ink/60">
            {status === "loading"
              ? "Loading the latest source-linked records..."
              : "No latest items are available yet."}
          </p>
        )}

        {laneCounts.length > 0 ? (
          <div className="border-t border-ink/8 pt-5">
            <p className="text-sm font-semibold text-moss">Issue lanes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {laneCounts.map((lane) => (
                <span
                  key={lane.lane}
                  className="rounded-md border border-ink/10 bg-sand/55 px-3 py-2 text-sm font-semibold text-ink/68"
                >
                  {lane.label} ({lane.count})
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {latestEntries.length > 0 ? (
          <div className="border-t border-ink/8 pt-5">
            <p className="text-sm font-semibold text-moss">
              {searchActive ? "More matches" : "Also recent"}
            </p>
            <div className="mt-1 divide-y divide-ink/8">
              {latestEntries.map((entry) => (
                <LatestItem key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ) : null}

        {trackedSources.length > 0 ? (
          <div className="border-t border-ink/8 pt-5">
            <p className="text-sm font-semibold text-moss">Source coverage</p>
            <p className="mt-2 text-sm leading-6 text-ink/64">
              Watching {trackedSources.length} official sources across{" "}
              {sourceLanes.length} registry lanes. The latest feed favors newly
              posted public notices; meeting archives, agendas, minutes,
              calendar items, code, parks, and planning sources remain
              searchable and source-linked.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FeaturedEntry({
  entry,
  searchActive
}: {
  entry: PublicEntry;
  searchActive: boolean;
}) {
  const primarySource = entry.sourceLinks[0];
  const signal = buildRecordSignal(entry);

  return (
    <article className="border-t border-ink/8 pt-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/46">
        <span className="text-clay">
          {searchActive ? "Best match" : "Top latest news"}
        </span>
        <span>{signal.laneLabel}</span>
        <span>{signal.importanceLabel}</span>
        <span>{signal.sourceDate}</span>
      </div>
      <h3 className="mt-3 font-serif text-3xl leading-tight text-ink">
        {entry.title}
      </h3>
      <p className="mt-3 text-base leading-7 text-ink/74">{entry.summary}</p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <p className="rounded-md bg-sand/70 px-3 py-2 leading-6 text-ink/66">
          <span className="font-semibold text-ink">Why it matters: </span>
          {signal.why}
        </p>
        <p className="rounded-md bg-sand/70 px-3 py-2 leading-6 text-ink/66">
          <span className="font-semibold text-ink">Next step: </span>
          {signal.dateToKnow ? `${signal.dateToKnow}. ` : ""}
          {signal.action}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {primarySource ? (
          <a
            href={primarySource.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Open official source
          </a>
        ) : null}
        {entry.detailUrl ? (
          <a
            href={entry.detailUrl}
            className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
          >
            Details
          </a>
        ) : null}
      </div>
    </article>
  );
}

function LatestItem({ entry }: { entry: PublicEntry }) {
  const primarySource = entry.sourceLinks[0];
  const signal = buildRecordSignal(entry);

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-ink/50">
        <span className="text-moss">{signal.laneLabel}</span>
        <span>{signal.sourceDate}</span>
        <span>{entry.sourceLabel}</span>
      </div>
      <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">
        {entry.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink/68">{entry.summary}</p>
      <p className="mt-2 text-sm leading-6 text-ink/56">
        {signal.dateToKnow ? `${signal.dateToKnow}. ` : ""}
        {signal.action}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {primarySource ? (
          <a
            href={primarySource.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Open source
          </a>
        ) : null}
        {entry.detailUrl ? (
          <a
            href={entry.detailUrl}
            className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
          >
            Details
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  inverted = false
}: {
  label: string;
  value: string | number;
  inverted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 ${
        inverted ? "border-t border-white/16 sm:border-t-0" : ""
      }`}
    >
      <p
        className={`text-xs font-semibold ${
          inverted ? "text-white/58" : "text-ink/50"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-right font-serif text-2xl leading-none ${
          inverted ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
