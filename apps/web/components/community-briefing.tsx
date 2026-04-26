"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { PublicEntry } from "../lib/data";

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

const quickChecks = ["Ashford Meadows", "Route 30", "Planning Commission"];

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
  const sourceTotal = useMemo(
    () => new Set(entries.map((entry) => entry.sourceLabel)).size,
    [entries]
  );
  const sourceLanes = useMemo(
    () =>
      Array.from(
        new Set(trackedSources.map((source) => source.publicCategory))
      ).sort(),
    [trackedSources]
  );
  const recentEntries = useMemo(() => getRecentEntries(entries), [entries]);
  const latestEntries = recentEntries.slice(0, 3);
  const mostRecent = recentEntries[0];

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
    <section className="space-y-5 rounded-lg border border-ink/10 bg-white p-5">
      <div>
        <p className="text-sm font-semibold text-moss">
          {searchActive ? "Top matches" : "Latest local updates"}
        </p>
        <h2 className="mt-1 font-serif text-3xl leading-tight text-ink">
          {searchActive ? `For "${query}"` : "What changed most recently"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/62">
          Source-linked items from the local record, ordered by the date on the
          underlying source when available.
        </p>

        <div className="mt-4 divide-y divide-ink/8">
          {latestEntries.length > 0 ? (
            latestEntries.map((entry) => (
              <LatestItem key={entry.id} entry={entry} />
            ))
          ) : (
            <p className="rounded-md border border-dashed border-ink/15 px-4 py-3 text-sm leading-6 text-ink/60">
              {status === "loading"
                ? "Loading the latest source-linked records..."
                : "No latest items are available yet."}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-ink/8 pt-5">
        <p className="text-sm font-semibold text-moss">Search this locality</p>
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

      <div className="divide-y divide-ink/8 border-t border-ink/8 pt-2">
        <Metric
          label={searchActive ? `Matches for "${query}"` : "Published records"}
          value={status === "loading" ? "..." : total || entries.length}
        />
        <Metric label="Source names in records" value={sourceTotal} />
        <Metric
          label="Tracked official sources"
          value={trackedSources.length}
        />
        <Metric
          label="Latest source date"
          value={
            mostRecent
              ? formatDate(
                  mostRecent.sourceMaterialDate ?? mostRecent.publishedAt
                )
              : "None"
          }
        />
      </div>

      {trackedSources.length > 0 ? (
        <div className="border-t border-ink/8 pt-5">
          <p className="text-sm font-semibold text-moss">Source coverage</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">
            Watching {trackedSources.length} official sources across{" "}
            {sourceLanes.length} coverage lanes. Current published records show{" "}
            {sourceTotal} source name{sourceTotal === 1 ? "" : "s"} represented.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sourceLanes.map((lane) => (
              <span
                key={lane}
                className="rounded-md border border-ink/10 bg-sand/45 px-3 py-1.5 text-xs font-semibold text-ink/64"
              >
                {lane}
              </span>
            ))}
          </div>
          <div className="mt-4 divide-y divide-ink/8 text-sm">
            {trackedSources.slice(0, 5).map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block py-3 font-semibold text-ink/70 transition first:pt-0 last:pb-0 hover:text-moss"
              >
                {source.name}
                <span className="mt-1 block font-normal text-ink/48">
                  {source.publicCategory}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LatestItem({ entry }: { entry: PublicEntry }) {
  const primarySource = entry.sourceLinks[0];

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-ink/50">
        <span>{formatDate(entry.sourceMaterialDate ?? entry.publishedAt)}</span>
        <span>{entry.sourceLabel}</span>
      </div>
      <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">
        {entry.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink/68">{entry.summary}</p>
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <p className="text-xs font-semibold text-ink/50">{label}</p>
      <p className="text-right font-serif text-2xl leading-none text-ink">
        {value}
      </p>
    </div>
  );
}
