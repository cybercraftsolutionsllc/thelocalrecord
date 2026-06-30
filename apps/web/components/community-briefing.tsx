"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { PublicEntry } from "../lib/data";
import {
  buildRecordSignal,
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
  municipalityName: string;
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
  { label: "Roads", query: "road closure" },
  { label: "Butter Rd", query: "Butter Road" },
  { label: "Votes", query: "ordinance vote" },
  { label: "Budget", query: "indebtedness" }
];

export function CommunityBriefing({
  municipalityName,
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
  const sourceLaneCount = useMemo(
    () =>
      new Set(trackedSources.map((source) => source.publicCategory)).size,
    [trackedSources]
  );
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
    <section className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-card">
      <div className="relative overflow-hidden bg-ink px-4 py-5 text-white sm:px-7 sm:py-8">
        <img
          src="/images/manheim-hero.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-22"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/92 to-[#264c45]/82" />

        <div className="relative">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold text-sky">
              {municipalityName}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[0.98] text-white sm:text-6xl">
              What changed near you?
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/76 sm:text-base sm:leading-7">
              Search a road, project, ordinance, park, meeting, or plain
              question. Every answer stays tied to an official source.
            </p>

            <form
              className="mt-5 flex max-w-2xl overflow-hidden rounded-2xl bg-white shadow-card"
              onSubmit={submitLookup}
            >
              <label className="block min-w-0 flex-1">
                <span className="sr-only">Search local records</span>
                <input
                  type="search"
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Road, project, vote..."
                  className="h-12 w-full border-0 bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink/38 focus:bg-sky/35 sm:h-14"
                />
              </label>
              <button
                type="submit"
                disabled={draftQuery.trim().length < 3}
                className="h-12 w-20 shrink-0 bg-moss px-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-auto sm:px-6"
              >
                Search
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {quickChecks.map((check) => (
                <button
                  key={check.label}
                  type="button"
                  onClick={() => onSearch(check.query)}
                  className="shrink-0 rounded-full border border-white/18 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {check.label}
                </button>
              ))}
              {searchActive ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <FeaturedRecord
            entry={featuredEntry}
            signal={featuredSignal}
            searchActive={searchActive}
          />
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-6 text-ink/66">
            <p>
              <span className="font-semibold text-ink">
                {status === "loading" ? "..." : total}
              </span>{" "}
              {searchActive ? "matches" : "source-backed records"} from{" "}
              <span className="font-semibold text-ink">
                {trackedSources.length}
              </span>{" "}
              official sources across{" "}
              <span className="font-semibold text-ink">
                {sourceLaneCount}
              </span>{" "}
              topics.
            </p>
            <p className="font-semibold text-moss">
              {filteredCount} item{filteredCount === 1 ? "" : "s"} in view
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
                All
              </button>
            </div>
          ) : null}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {laneOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={activeLane === option.key}
              onClick={() => onSelectLane(option.key)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                activeLane === option.key
                  ? "bg-moss text-white"
                  : "border border-ink/10 bg-white text-ink/64 hover:border-moss/25 hover:text-moss"
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedRecord({
  entry,
  signal,
  searchActive
}: {
  entry?: PublicEntry;
  signal: ReturnType<typeof buildRecordSignal> | null;
  searchActive: boolean;
}) {
  const primarySource = entry?.sourceLinks[0];

  if (!entry || !signal) {
    return (
      <aside className="mt-4 rounded-2xl border border-white/16 bg-white/10 p-3 text-white sm:mt-5 sm:p-4">
        <p className="text-sm font-semibold text-sky">Loading record</p>
        <p className="mt-2 text-sm leading-6 text-white/72">
          Waiting for the live source feed.
        </p>
      </aside>
    );
  }

  return (
    <aside className="mt-4 rounded-2xl border border-white/16 bg-white/10 p-3 text-white shadow-card backdrop-blur sm:mt-5 sm:p-4">
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky">
            {searchActive ? "Best match" : "Latest to know"}
          </p>
          <h2 className="mt-2 font-serif text-lg leading-tight text-white sm:text-2xl">
            {entry.title}
          </h2>
          <p className="mt-2 hidden max-h-12 overflow-hidden text-sm leading-6 text-white/74 sm:block">
            {entry.summary}
          </p>
        </div>
        <div className="grid gap-1.5 text-sm sm:gap-2">
          <p className="clamp-2 leading-6 text-white/74">
            <span className="font-semibold text-white">Why: </span>
            {signal.why}
          </p>
          <p className="clamp-2 leading-6 text-white/74">
            <span className="font-semibold text-white">Do: </span>
            {signal.dateToKnow ? `${signal.dateToKnow}. ` : ""}
            {signal.action}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
        {primarySource ? (
          <a
            href={primarySource.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky"
          >
            Official source
          </a>
        ) : null}
        {entry.detailUrl ? (
          <a
            href={entry.detailUrl}
            className="rounded-lg border border-white/18 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Details
          </a>
        ) : null}
      </div>
    </aside>
  );
}
