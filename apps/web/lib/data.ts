import { getMunicipalityBySlug, getSourcesForMunicipality, municipalities } from "@thelocalrecord/core";

type PublicEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  sourceMaterialDate?: string | null;
  extractionNote?: string | null;
  sourceLabel: string;
  sourceLinks: Array<{ label: string; url: string }>;
};

type ReviewEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  reason: string;
  sourceUrl: string;
};

export function getHomepageData() {
  return {
    municipalities
  };
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
      entries: [] satisfies PublicEntry[]
    };
  }

  try {
    const { getMunicipalityWithSources, getPublishedEntriesByMunicipality } = await import(
      "@thelocalrecord/storage"
    );

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
        publishedAt: entry.publication?.publishedAt.toISOString() ?? entry.createdAt.toISOString(),
        extractionNote: entry.extractionNote,
        sourceLabel: entry.sourceItem.source.name,
        sourceLinks: JSON.parse(entry.sourceLinksJson) as Array<{ label: string; url: string }>
      }))
    };
  } catch {
    return {
      municipality: {
        ...municipalityConfig,
        sources: getSourcesForMunicipality(slug)
      },
      entries: [] satisfies PublicEntry[]
    };
  }
}

export type { PublicEntry, ReviewEntry };

export async function getReviewData(slug: string) {
  if (!databaseEnabled()) {
    return [] satisfies ReviewEntry[];
  }

  try {
    const { getReviewQueueByMunicipality } = await import("@thelocalrecord/storage");
    const reviewEntries = await getReviewQueueByMunicipality(slug);

    return reviewEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      category: entry.category,
      reason: entry.extractionNote ?? "Manual review required by editorial rule.",
      sourceUrl: entry.sourceItem.sourceUrl
    })) satisfies ReviewEntry[];
  } catch {
    return [] satisfies ReviewEntry[];
  }
}
