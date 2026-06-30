import {
  getMunicipalityBySlug,
  getSourcesForMunicipality,
  municipalities
} from "@thelocalrecord/core";

const publicContentApiBase =
  process.env.NEXT_PUBLIC_CONTENT_API_BASE ??
  "https://thelocalrecord-api.cybercraftsolutions.workers.dev";

type PublicEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  impactLevel?: string;
  publishedAt: string;
  sourceMaterialDate?: string | null;
  extractionNote?: string | null;
  sourceLabel: string;
  sourceLinks: Array<{ label: string; url: string }>;
  detailUrl?: string;
  topicText?: string;
};

type ReviewEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  reason: string;
  sourceUrl: string;
};

type ApiEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  impact_level?: string;
  source_links_json: string;
  extraction_note?: string | null;
  published_at: string;
  source_material_date?: string | null;
  source_name?: string;
  topic_text?: string;
};

type PublishedPayload = {
  entries?: ApiEntry[];
};

export function getHomepageData() {
  return {
    municipalities
  };
}

export function getLocalitiesDirectory() {
  return municipalities.map((municipality) => ({
    ...municipality,
    county: "Lancaster County",
    statusLabel:
      municipality.slug === "manheimtownshippa"
        ? "Live now"
        : "Planned coverage"
  }));
}

function databaseEnabled() {
  return process.env.ENABLE_DATABASE === "true";
}

export async function getLocalityData(slug: string) {
  const municipalityConfig = getMunicipalityBySlug(slug);

  if (!municipalityConfig) {
    return null;
  }

  if (!databaseEnabled()) {
    return {
      municipality: {
        ...municipalityConfig,
        sources: getSourcesForMunicipality(slug)
      },
      entries: await getPublicApiEntries(slug)
    };
  }

  try {
    const { getMunicipalityWithSources, getPublishedEntriesByMunicipality } =
      await import("@thelocalrecord/storage");

    const [municipality, publishedEntries] = await Promise.all([
      getMunicipalityWithSources(slug),
      getPublishedEntriesByMunicipality(slug)
    ]);

    return {
      municipality: municipality ?? {
        ...municipalityConfig,
        sources: getSourcesForMunicipality(slug)
      },
      entries: publishedEntries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        category: entry.category,
        impactLevel: entry.impactLevel,
        publishedAt:
          entry.publication?.publishedAt.toISOString() ??
          entry.createdAt.toISOString(),
        extractionNote: entry.extractionNote,
        sourceLabel: entry.sourceItem.source.name,
        sourceLinks: JSON.parse(entry.sourceLinksJson) as Array<{
          label: string;
          url: string;
        }>,
        detailUrl: `/${slug}/item/?id=${encodeURIComponent(entry.id)}`,
        topicText: entry.sourceItem.normalizedText
      }))
    };
  } catch {
    return {
      municipality: {
        ...municipalityConfig,
        sources: getSourcesForMunicipality(slug)
      },
      entries: await getPublicApiEntries(slug)
    };
  }
}

export type { PublicEntry, ReviewEntry };

async function getPublicApiEntries(slug: string): Promise<PublicEntry[]> {
  try {
    const response = await fetch(
      `${publicContentApiBase}/api/localities/${slug}/published?page=1&pageSize=18`
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PublishedPayload;

    return (payload.entries ?? []).map((entry) => ({
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
    }));
  } catch {
    return [];
  }
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
      .filter(
        (item, index, collection) =>
          collection.findIndex((candidate) => candidate.url === item.url) ===
          index
      );
  } catch {
    return [];
  }
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

export async function getReviewData(slug: string) {
  if (!databaseEnabled()) {
    return [] satisfies ReviewEntry[];
  }

  try {
    const { getReviewQueueByMunicipality } =
      await import("@thelocalrecord/storage");
    const reviewEntries = await getReviewQueueByMunicipality(slug);

    return reviewEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      category: entry.category,
      reason:
        entry.extractionNote ?? "Manual review required by editorial rule.",
      sourceUrl: entry.sourceItem.sourceUrl
    })) satisfies ReviewEntry[];
  } catch {
    return [] satisfies ReviewEntry[];
  }
}
