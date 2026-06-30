"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { PublicEntry } from "../lib/data";
import {
  buildRecordSignal,
  formatRecordDate,
  type ResidentLaneKey
} from "../lib/record-signals";

type TrackedSource = {
  name: string;
  publicCategory: string;
  url: string;
};

type LaneOption = {
  key: ResidentLaneKey;
  label: string;
  count: number;
};

type FeedViewKey = "events_of_note" | "all_records";

type CommunityBriefingProps = {
  entries: PublicEntry[];
  featuredEntry?: PublicEntry;
  trackedSources: TrackedSource[];
  total: number;
  filteredCount: number;
  status: "idle" | "loading" | "ready" | "error";
  searchActive: boolean;
  query: string;
  laneOptions: LaneOption[];
  activeLane: ResidentLaneKey;
  feedView: FeedViewKey;
  onClearSearch: () => void;
  onSearch: (query: string) => void;
  onSelectLane: (lane: ResidentLaneKey) => void;
  onSelectFeedView: (view: FeedViewKey) => void;
};

const quickChecks = [
  { label: "Road closures", query: "road closure" },
  { label: "Butter Road", query: "Butter Road" },
  { label: "Ordinance votes", query: "ordinance vote" },
  { label: "High Meadow", query: "High Meadow" },
  { label: "Budget or debt", query: "indebtedness" }
];

function formatDate(value?: string | null) {
  return formatRecordDate(value);
}

function formatSourceCategory(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CommunityBriefing({
  entries,
  featuredEntry,
  trackedSources,
  total,
  filteredCount,
  status,
  onClearSearch,
  searchActive,
  query,
  laneOptions,
  activeLane,
  feedView,
  onSearch,
  onSelectLane,
  onSelectFeedView
}: CommunityBriefingProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const sourceLanes = useMemo(
    () =>
      Array.from(
        new Set(trackedSources.map((source) => source.publicCategory))
      ).sort(),
    [trackedSources]
  );
  const latestEntry = entries[0];
  const featuredSignal = featuredEntry
    ? buildRecordSignal(featuredEntry)
    : null;

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
    <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card">
      <div className="grid min-h-[540px] lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="p-5 sm:p-7 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
            {searchActive ? "Live search" : "Resident command center"}
          </p>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-ink sm:text-5xl">
            {searchActive
              ? `Results for "${query}"`
              : "Search the local record."}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/68 sm:mt-4 sm:text-base sm:leading-7">
            Type what you saw or what you care about. The record turns township
            posts, notices, agendas, minutes, and project records into one
            source-linked resident view.
          </p>

          <form
            className="mt-4 overflow-hidden rounded-xl border border-ink/12 bg-white shadow-card sm:mt-6 sm:flex"
            onSubmit={submitLookup}
          >
            <label className="block min-w-0 flex-1">
              <span className="sr-only">Search local records</span>
              <input
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Try a street, project, ordinance, park, or question..."
                className="h-14 w-full border-0 bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink/38 focus:bg-sky/35"
              />
            </label>
            <button
              type="submit"
              disabled={draftQuery.trim().length < 3}
              className="h-14 w-full bg-moss px-6 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Search record
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickChecks.map((check) => (
              <button
                key={check.label}
                type="button"
                onClick={() => onSearch(check.query)}
                className="rounded-lg border border-ink/10 bg-sand/70 px-3 py-2 text-sm font-semibold text-ink/68 transition hover:border-moss/25 hover:bg-white hover:text-moss"
              >
                {check.label}
              </button>
            ))}
            {searchActive ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="rounded-lg border border-clay/20 bg-white px-3 py-2 text-sm font-semibold text-clay transition hover:bg-sky/40"
              >
                Clear search
              </button>
            ) : null}
          </div>

          <div className="mt-7 grid gap-4 border-t border-ink/8 pt-5 text-sm sm:grid-cols-3">
            <Metric
              label={searchActive ? "Matches found" : "Records indexed"}
              value={status === "loading" ? "..." : total || entries.length}
            />
            <Metric
              label="Latest source date"
              value={
                latestEntry
                  ? formatDate(
                      latestEntry.sourceMaterialDate ?? latestEntry.publishedAt
                    )
                  : "None"
              }
            />
            <Metric
              label="In this view"
              value={status === "loading" ? "..." : filteredCount}
            />
          </div>
        </div>

        <FeaturePanel
          entry={featuredEntry}
          signal={featuredSignal}
          searchActive={searchActive}
        />
      </div>

      <div className="border-t border-ink/8 px-5 py-5 sm:px-7 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-moss">
                  Browse by resident need
                </p>
                <p className="mt-1 text-sm leading-6 text-ink/58">
                  Start broad, then narrow by the kind of thing that could
                  affect your day, property, route, or meeting.
                </p>
              </div>
              {!searchActive ? (
                <div className="grid grid-cols-2 rounded-xl border border-ink/10 bg-sand p-1">
                  <button
                    type="button"
                    onClick={() => onSelectFeedView("events_of_note")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      feedView === "events_of_note"
                        ? "bg-white text-moss shadow-sm"
                        : "text-ink/58 hover:text-moss"
                    }`}
                  >
                    Important
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectFeedView("all_records")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      feedView === "all_records"
                        ? "bg-white text-moss shadow-sm"
                        : "text-ink/58 hover:text-moss"
                    }`}
                  >
                    Everything
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {laneOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={activeLane === option.key}
                  onClick={() => onSelectLane(option.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    activeLane === option.key
                      ? "bg-moss text-white"
                      : "border border-ink/10 bg-white text-ink/66 hover:border-moss/25 hover:text-moss"
                  }`}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-ink/8 pt-5 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="font-semibold text-moss">Source coverage</p>
            <p className="mt-2 leading-6 text-ink/62">
              Watching {trackedSources.length} official sources across{" "}
              {sourceLanes.length} source lanes. Every useful item links back
              to an original post, document, agenda, minutes, or public notice.
            </p>
            {sourceLanes.length > 0 ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
                {sourceLanes.map(formatSourceCategory).join(" / ")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturePanel({
  entry,
  signal,
  searchActive
}: {
  entry?: PublicEntry;
  signal: ReturnType<typeof buildRecordSignal> | null;
  searchActive: boolean;
}) {
  const primarySource = entry?.sourceLinks[0];

  return (
    <aside className="relative min-h-[360px] overflow-hidden bg-ink p-5 text-white sm:p-7 lg:p-8">
      <img
        src="/images/manheim-hero.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-24"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-[#284b45]/80" />
      <div className="relative flex h-full flex-col justify-between gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky">
            {searchActive ? "Best match" : "Top latest news"}
          </p>
          {entry && signal ? (
            <>
              <h3 className="mt-3 font-serif text-3xl leading-tight text-white">
                {entry.title}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/70">
                <span>{signal.laneLabel}</span>
                <span>{signal.importanceLabel}</span>
                <span>{signal.sourceDate}</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/78">
                {entry.summary}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-3 font-serif text-3xl leading-tight text-white">
                The live record is loading.
              </h3>
              <p className="mt-5 text-sm leading-6 text-white/78">
                Records will appear here as soon as the source feed responds.
              </p>
            </>
          )}
        </div>

        {entry && signal ? (
          <div className="border-t border-white/16 pt-5">
            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
              <p className="leading-6 text-white/72">
                <span className="font-semibold text-white">
                  Why it matters:{" "}
                </span>
                {signal.why}
              </p>
              <p className="leading-6 text-white/72">
                <span className="font-semibold text-white">Do next: </span>
                {signal.dateToKnow ? `${signal.dateToKnow}. ` : ""}
                {signal.action}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {primarySource ? (
                <a
                  href={primarySource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky"
                >
                  Open official source
                </a>
              ) : null}
              {entry.detailUrl ? (
                <a
                  href={entry.detailUrl}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Read record
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-t border-ink/8 pt-3 sm:border-t-0 sm:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-none text-ink">{value}</p>
    </div>
  );
}
