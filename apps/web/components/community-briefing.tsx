"use client";

import { useEffect, useMemo, useState } from "react";

import type { PublicEntry } from "../lib/data";

type CommunityBriefingProps = {
  entries: PublicEntry[];
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
  const sourceTotal = useMemo(
    () => new Set(entries.map((entry) => entry.sourceLabel)).size,
    [entries]
  );
  const mostRecent = getMostRecent(entries);

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
    <section className="rounded-lg border border-ink/10 bg-white p-5">
      <form className="space-y-3" onSubmit={submitLookup}>
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

      <div className="mt-5 divide-y divide-ink/8 border-t border-ink/8 pt-2">
        <Metric
          label={searchActive ? `Matches for "${query}"` : "Records"}
          value={status === "loading" ? "..." : total || entries.length}
        />
        <Metric label="Sources" value={sourceTotal} />
        <Metric
          label="Latest"
          value={
            mostRecent
              ? formatDate(
                  mostRecent.sourceMaterialDate ?? mostRecent.publishedAt
                )
              : "None"
          }
        />
      </div>

      {mostRecent ? (
        <div className="mt-5 border-t border-ink/8 pt-5">
          <p className="text-sm font-semibold text-moss">Latest source item</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">
            {mostRecent.title}
          </p>
        </div>
      ) : null}
    </section>
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
