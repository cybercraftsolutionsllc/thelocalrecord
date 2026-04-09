import { evaluateItem } from "@thelocalrecord/content";
import {
  getMunicipalityBySlug,
  getSourcesForMunicipality,
  hashContent,
  municipalities
} from "@thelocalrecord/core";
import {
  attachRunArtifact,
  close,
  completeFetchRun,
  createFetchRun,
  ensureMunicipality,
  persistNormalizedItem
} from "@thelocalrecord/storage";

import { parseAgendaCenter } from "./adapters/agenda-center";
import { parseAlertCenter } from "./adapters/alert-center";
import { parseNewsFlash } from "./adapters/news-flash";

type AdapterResult = {
  itemCount: number;
  changeCount: number;
};

export async function ingestMunicipality(slug: string) {
  const municipality = getMunicipalityBySlug(slug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }

  const { municipality: municipalityRecord, sources } = await ensureMunicipality(municipality);
  const fetchRun = await createFetchRun(municipalityRecord.id);
  const sourceMap = new Map(sources.map((source) => [source.slug, source]));

  const stats = {
    sourcesFetched: 0,
    itemsSeen: 0,
    diffEventsCreated: 0
  };

  try {
    for (const source of getSourcesForMunicipality(slug).filter((entry) => entry.implemented)) {
      const sourceRecord = sourceMap.get(source.slug);

      if (!sourceRecord) {
        continue;
      }

      const result = await ingestSource({
        municipalityId: municipalityRecord.id,
        fetchRunId: fetchRun.id,
        sourceId: sourceRecord.id,
        sourceSlug: source.slug,
        sourceUrl: source.url
      });

      stats.sourcesFetched += 1;
      stats.itemsSeen += result.itemCount;
      stats.diffEventsCreated += result.changeCount;
    }

    await completeFetchRun({
      fetchRunId: fetchRun.id,
      status: "completed",
      stats
    });

    return stats;
  } catch (error) {
    await completeFetchRun({
      fetchRunId: fetchRun.id,
      status: "failed",
      stats,
      errorMessage: error instanceof Error ? error.message : "Unknown ingest failure"
    });

    throw error;
  } finally {
    await close();
  }
}

export async function ingestAllMunicipalities() {
  const results: Record<string, Awaited<ReturnType<typeof ingestMunicipality>>> = {};

  for (const municipality of municipalities) {
    results[municipality.slug] = await ingestMunicipality(municipality.slug);
  }

  return results;
}

async function ingestSource(args: {
  municipalityId: string;
  fetchRunId: string;
  sourceId: string;
  sourceSlug: string;
  sourceUrl: string;
}): Promise<AdapterResult> {
  const response = await fetch(args.sourceUrl, {
    headers: {
      "user-agent":
        process.env.INGEST_USER_AGENT ??
        "thelocalrecord-bot/0.1 (+https://github.com/example/thelocalrecord)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${args.sourceUrl}: ${response.status}`);
  }

  const body = await response.text();

  await attachRunArtifact({
    fetchRunId: args.fetchRunId,
    sourceId: args.sourceId,
    url: args.sourceUrl,
    sha256: hashContent(body),
    kind: "source_response",
    mimeType: response.headers.get("content-type") ?? undefined
  });

  const items = selectAdapter(args.sourceSlug, body, args.sourceUrl);
  let changeCount = 0;

  for (const item of items) {
    const decision = evaluateItem(item);
    const diffEvent = await persistNormalizedItem({
      municipalityId: args.municipalityId,
      sourceId: args.sourceId,
      fetchRunId: args.fetchRunId,
      item,
      decision
    });

    if (diffEvent) {
      changeCount += 1;
    }
  }

  return {
    itemCount: items.length,
    changeCount
  };
}

function selectAdapter(sourceSlug: string, body: string, sourceUrl: string) {
  switch (sourceSlug) {
    case "agenda-center":
      return parseAgendaCenter(body, sourceUrl);
    case "township-news":
      return parseNewsFlash(body, sourceUrl);
    case "alert-center":
      return parseAlertCenter(body, sourceUrl);
    default:
      return [];
  }
}
