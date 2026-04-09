"use client";

import { useEffect, useState } from "react";

import type { PublicEntry } from "../lib/data";
import { contentApiBase } from "../lib/public-config";

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
};

type PublishedPayload = {
  entries: ApiEntry[];
  total: number;
  page: number;
  pageSize: number;
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

  if (lowerLabel.includes("source page")) {
    return "Listing page";
  }

  if (lowerLabel.includes("source item")) {
    return url.toLowerCase().endsWith(".pdf") ? "Original document" : "Original post";
  }

  if (index === 0) {
    return url.toLowerCase().endsWith(".pdf") ? "Original document" : "Original post";
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

        return typeof candidate.label === "string" && typeof candidate.url === "string";
      })
      .map((item, index) => ({
        label: relabelSourceLink(item.label, item.url, index),
        url: item.url
      }))
      .filter((item, index, collection) => {
        return collection.findIndex((candidate) => candidate.url === item.url) === index;
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
    sourceLinks: parseSourceLinks(entry.source_links_json)
  };
}

export function LivePublishedEntries({ slug, initialEntries }: LivePublishedEntriesProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialEntries.length);
  const pageSize = 10;

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

        const payload = normalizePayload((await response.json()) as PublishedPayload | ApiEntry[]);

        if (!cancelled) {
          setEntries(payload.entries.map(mapApiEntry));
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

  if (entries.length > 0) {
    return (
      <div className="space-y-5">
        {entries.map((entry) => (
          <UpdateCard key={entry.id} {...entry} />
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/70">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-moss disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-dashed border-ink/15 bg-white p-8 text-ink/70 shadow-card">
      <h3 className="font-serif text-2xl text-moss">
        {status === "loading" ? "Loading published entries" : "No published entries yet"}
      </h3>
      <p className="mt-3 max-w-2xl leading-7">
        {status === "error"
          ? "The live content API did not respond. The static page shell is still available while data sync is checked."
          : "The source registry is ready and the page is live. Once ingest publishes low-risk updates, they will appear here with source links."}
      </p>
    </div>
  );
}
