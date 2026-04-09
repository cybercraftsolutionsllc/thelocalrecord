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
};

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
      .map((item) => ({
        label: item.label,
        url: item.url
      }));
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
    extractionNote: entry.extraction_note ?? null,
    sourceLabel: "Cloudflare worker API",
    sourceLinks: parseSourceLinks(entry.source_links_json)
  };
}

export function LivePublishedEntries({ slug, initialEntries }: LivePublishedEntriesProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!contentApiBase) {
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus("loading");

      try {
        const response = await fetch(`${contentApiBase}/api/localities/${slug}/published`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Failed to load published entries");
        }

        const payload = (await response.json()) as ApiEntry[];

        if (!cancelled) {
          setEntries(payload.map(mapApiEntry));
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
  }, [slug]);

  if (entries.length > 0) {
    return (
      <div className="space-y-5">
        {entries.map((entry) => (
          <UpdateCard key={entry.id} {...entry} />
        ))}
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
