import { evaluateItem } from "@thelocalrecord/content";
import {
  getMunicipalityBySlug,
  getSourcesForMunicipality,
  hashContent,
  type NormalizedSourceItem
} from "@thelocalrecord/core";
import { enrichSourceItemsWithFetchedDetails } from "@thelocalrecord/ingest/detail-enrichment";
import {
  parseCalendarPage,
  parseCodeCompliancePage,
  parseComprehensivePlanPage,
  parseFaqPage,
  parseIcalendarDirectory,
  parseAgendaCenter,
  parsePlanningCommissionAgendasArchive,
  parsePlanningCommissionMinutesArchive,
  parseAlertCenter,
  parseNewsFlash,
  parsePlanningZoningFaqPage,
  parsePlanningCommissionPage,
  parsePlanningZoningPage,
  parseZoningHearingBoardPage,
  parseViewPage
} from "@thelocalrecord/ingest/adapters";

import {
  attachArtifactRecord,
  completeFetchRun,
  createFetchRun,
  findExistingSourceItem,
  listSourceItemsForMunicipality,
  persistNormalizedItem,
  syncRegistry,
  touchSourceItem,
  updateContentEntriesForSourceItem,
  type StoredSourceItemRecord
} from "./d1";
import type { WorkerEnv } from "./env";
import { maybeRefineSummaryWithOpenAI } from "./openai";

export type IngestStats = {
  sourcesFetched: number;
  sourcesFailed: number;
  itemsSeen: number;
  diffEventsCreated: number;
};

export type IngestSourceFailure = {
  sourceSlug: string;
  sourceName: string;
  sourceUrl: string;
  message: string;
};

export type IngestResult = {
  stats: IngestStats;
  sourceFailures: IngestSourceFailure[];
};

export async function ingestMunicipality(env: WorkerEnv, slug: string) {
  const municipality = getMunicipalityBySlug(slug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }

  await syncRegistry(env.DB);
  const fetchRunId = await createFetchRun(env.DB, slug);
  const stats: IngestStats = {
    sourcesFetched: 0,
    sourcesFailed: 0,
    itemsSeen: 0,
    diffEventsCreated: 0
  };
  const sourceFailures: IngestSourceFailure[] = [];
  const seenCrossSourceKeys = new Set<string>();

  try {
    for (const source of getSourcesForMunicipality(slug).filter((entry) => entry.implemented)) {
      try {
        const response = await fetch(source.url, {
          headers: {
            "user-agent":
              env.INGEST_USER_AGENT ?? "thelocalrecord-bot/0.1 (+https://thelocalrecord.org)"
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
        }

        const body = await response.text();
        const contentType = response.headers.get("content-type") ?? "text/html; charset=utf-8";
        const storageKey = buildArtifactKey(slug, source.slug, fetchRunId);

        await env.ARTIFACTS.put(storageKey, body, {
          httpMetadata: {
            contentType
          },
          customMetadata: {
            municipality: slug,
            source: source.slug,
            fetchRunId
          }
        });

        await attachArtifactRecord(env.DB, {
          fetchRunId,
          sourceSlug: source.slug,
          kind: "source_response",
          storageKey,
          url: source.url,
          sha256: hashContent(body),
          mimeType: contentType
        });

        const selectedItems = await selectAdapter(env, source.slug, body, source.url);
        const items = await enrichSourceItemsWithFetchedDetails(selectedItems, source.slug, {
          fetchImpl: fetch,
          userAgent: env.INGEST_USER_AGENT
        });
        stats.sourcesFetched += 1;
        stats.itemsSeen += items.length;

        for (const item of items) {
          const duplicateKey = buildCrossSourceDuplicateKey(item);

          if (duplicateKey && seenCrossSourceKeys.has(duplicateKey)) {
            continue;
          }

          const existing = await findExistingSourceItem(env.DB, item.sourceSlug, item.externalId);

          if (existing?.content_hash === item.contentHash) {
            await touchSourceItem(env.DB, existing.id);

            if (duplicateKey) {
              seenCrossSourceKeys.add(duplicateKey);
            }

            continue;
          }

          const ruleDecision = evaluateItem(item);
          const decision = await maybeRefineSummaryWithOpenAI(env, item, ruleDecision);
          const diffEventId = await persistNormalizedItem(env.DB, {
            item,
            decision,
            fetchRunId
          });

          if (duplicateKey) {
            seenCrossSourceKeys.add(duplicateKey);
          }

          if (diffEventId) {
            stats.diffEventsCreated += 1;
          }
        }
      } catch (error) {
        const failure = {
          sourceSlug: source.slug,
          sourceName: source.name,
          sourceUrl: source.url,
          message: error instanceof Error ? error.message : "Unknown source ingest failure"
        };

        stats.sourcesFailed += 1;
        sourceFailures.push(failure);
        console.error("Source ingest failed", JSON.stringify(failure));
      }
    }

    if (stats.sourcesFetched === 0 && sourceFailures.length > 0) {
      const errorMessage = buildSourceFailureMessage(sourceFailures);

      await completeFetchRun(env.DB, fetchRunId, "failed", stats, errorMessage);
      throw new Error(errorMessage);
    }

    await completeFetchRun(env.DB, fetchRunId, "completed", stats);
    return {
      stats,
      sourceFailures
    };
  } catch (error) {
    await completeFetchRun(
      env.DB,
      fetchRunId,
      "failed",
      stats,
      error instanceof Error ? error.message : "Unknown ingest failure"
    );

    throw error;
  }
}

export async function importMunicipalityItems(
  env: WorkerEnv,
  slug: string,
  items: NormalizedSourceItem[]
) {
  const municipality = getMunicipalityBySlug(slug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }

  await syncRegistry(env.DB);
  const fetchRunId = await createFetchRun(env.DB, slug);
  const stats: IngestStats = {
    sourcesFetched: 0,
    sourcesFailed: 0,
    itemsSeen: items.length,
    diffEventsCreated: 0
  };

  try {
    const sourceSlugs = new Set(items.map((item) => item.sourceSlug));
    stats.sourcesFetched = sourceSlugs.size;

    for (const item of items) {
      const existing = await findExistingSourceItem(env.DB, item.sourceSlug, item.externalId);

      if (existing?.content_hash === item.contentHash) {
        await touchSourceItem(env.DB, existing.id);
        continue;
      }

      const ruleDecision = evaluateItem(item);
      const decision = await maybeRefineSummaryWithOpenAI(env, item, ruleDecision);
      const diffEventId = await persistNormalizedItem(env.DB, {
        item,
        decision,
        fetchRunId
      });

      if (diffEventId) {
        stats.diffEventsCreated += 1;
      }
    }

    await completeFetchRun(env.DB, fetchRunId, "completed", stats);
    return {
      stats,
      sourceFailures: []
    };
  } catch (error) {
    await completeFetchRun(
      env.DB,
      fetchRunId,
      "failed",
      stats,
      error instanceof Error ? error.message : "Unknown import failure"
    );

    throw error;
  }
}

export async function importPlanningCommissionArchives(env: WorkerEnv, slug: string) {
  const municipality = getMunicipalityBySlug(slug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }

  const archiveSources = [
    {
      sourceSlug: "planning-commission-agendas" as const,
      sourceName: "Planning Commission Agendas Archive",
      url: "https://www.manheimtownship.org/Archive.aspx?AMID=80",
      parser: parsePlanningCommissionAgendasArchive
    },
    {
      sourceSlug: "planning-commission-minutes" as const,
      sourceName: "Planning Commission Minutes Archive",
      url: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      parser: parsePlanningCommissionMinutesArchive
    }
  ];

  const importedItems: NormalizedSourceItem[] = [];
  const sourceFailures: IngestSourceFailure[] = [];
  let sourcesFetched = 0;

  for (const source of archiveSources) {
    try {
      const response = await fetch(source.url, {
        headers: {
          "user-agent":
            env.INGEST_USER_AGENT ?? "thelocalrecord-bot/0.1 (+https://thelocalrecord.org)"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
      }

      const html = await response.text();
      const parsed = source.parser(html, source.url);
      const enriched = await enrichSourceItemsWithFetchedDetails(parsed, source.sourceSlug, {
        fetchImpl: fetch,
        userAgent: env.INGEST_USER_AGENT
      });

      importedItems.push(...enriched);
      sourcesFetched += 1;
    } catch (error) {
      sourceFailures.push({
        sourceSlug: source.sourceSlug,
        sourceName: source.sourceName,
        sourceUrl: source.url,
        message: error instanceof Error ? error.message : "Unknown archive import failure"
      });
    }
  }

  if (importedItems.length === 0) {
    if (sourceFailures.length > 0) {
      throw new Error(buildSourceFailureMessage(sourceFailures));
    }

    return {
      stats: {
        sourcesFetched: 0,
        sourcesFailed: 0,
        itemsSeen: 0,
        diffEventsCreated: 0
      },
      sourceFailures: []
    };
  }

  const importedResult = await importMunicipalityItems(env, slug, importedItems);

  return {
    stats: {
      ...importedResult.stats,
      sourcesFetched,
      sourcesFailed: sourceFailures.length,
      itemsSeen: importedItems.length
    },
    sourceFailures
  };
}

export async function resummarizeMunicipalityItems(
  env: WorkerEnv,
  slug: string,
  sourceSlugs: string[]
) {
  const municipality = getMunicipalityBySlug(slug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }

  const storedItems = await listSourceItemsForMunicipality(env.DB, slug, sourceSlugs);
  let updated = 0;

  for (const storedItem of storedItems) {
    const item = mapStoredSourceItemToNormalizedItem(storedItem);
    const ruleDecision = evaluateItem(item);
    const decision = await maybeRefineSummaryWithOpenAI(env, item, ruleDecision);

    await updateContentEntriesForSourceItem(env.DB, {
      sourceItemId: storedItem.id,
      summary: decision.summary,
      category: decision.classification,
      riskLevel: decision.riskLevel,
      reviewState: decision.reviewState,
      extractionNote: decision.extractionNote
    });
    updated += 1;
  }

  return {
    sourceSlugs,
    sourceItemsUpdated: updated
  };
}

async function selectAdapter(
  env: WorkerEnv,
  sourceSlug: string,
  body: string,
  sourceUrl: string
) {
  switch (sourceSlug) {
    case "agenda-center":
      return parseAgendaCenter(body, sourceUrl);
    case "township-news":
      return parseNewsFlash(body, sourceUrl);
    case "alert-center":
      return parseAlertCenter(body, sourceUrl);
    case "calendar":
      return parseCalendarPage(body, sourceUrl);
    case "code-compliance":
      return parseCodeCompliancePage(body, sourceUrl);
    case "code-news":
      return parseNewsFlash(body, sourceUrl, "code-news");
    case "permit-faq":
      return parseFaqPage(body, sourceUrl);
    case "planning-zoning-faq":
      return parsePlanningZoningFaqPage(body, sourceUrl);
    case "comprehensive-plan":
      return parseComprehensivePlanPage(body, sourceUrl);
    case "planning-commission":
      return parsePlanningCommissionPage(body, sourceUrl);
    case "zoning-hearing-board":
      return parseZoningHearingBoardPage(body, sourceUrl);
    case "planning-commission-agendas":
      return parsePlanningCommissionAgendasArchive(body, sourceUrl);
    case "planning-commission-minutes":
      return parsePlanningCommissionMinutesArchive(body, sourceUrl);
    case "icalendar":
      return parseIcalendarDirectory(body, sourceUrl, fetch, env.INGEST_USER_AGENT);
    case "view-page":
      return parseViewPage(body, sourceUrl);
    case "planning-zoning":
      return parsePlanningZoningPage(body, sourceUrl);
    default:
      return [];
  }
}

function buildArtifactKey(municipalitySlug: string, sourceSlug: string, fetchRunId: string) {
  const datePath = new Date().toISOString().slice(0, 10);
  return `${municipalitySlug}/${sourceSlug}/${datePath}/${fetchRunId}.html`;
}

function buildCrossSourceDuplicateKey(item: NormalizedSourceItem) {
  if (
    [
      "view-page",
      "planning-zoning",
      "code-compliance",
      "comprehensive-plan"
    ].includes(item.sourceSlug)
  ) {
    return `resource|${item.sourceUrl.toLowerCase()}`;
  }

  if (!["calendar", "icalendar"].includes(item.sourceSlug)) {
    return null;
  }

  const sourceDate = item.eventDate ?? item.publishedAt;

  if (!sourceDate) {
    return null;
  }

  return `${item.title.toLowerCase()}|${sourceDate.slice(0, 10)}`;
}

function mapStoredSourceItemToNormalizedItem(
  storedItem: StoredSourceItemRecord
): NormalizedSourceItem {
  return {
    municipalitySlug: storedItem.municipality_slug,
    sourceSlug: storedItem.source_slug,
    externalId: storedItem.external_id,
    title: storedItem.title,
    sourceUrl: storedItem.source_url,
    sourcePageUrl: storedItem.source_page_url,
    normalizedText: storedItem.normalized_text,
    publishedAt: storedItem.published_at ?? undefined,
    eventDate: storedItem.event_date ?? undefined,
    extraction: {
      method: normalizeExtractionMethod(storedItem.extraction_method),
      confidence: storedItem.extraction_confidence,
      note: storedItem.extraction_note ?? undefined
    },
    metadata: parseMetadata(storedItem.metadata_json),
    contentHash: storedItem.content_hash
  };
}

function normalizeExtractionMethod(
  method: string
): NormalizedSourceItem["extraction"]["method"] {
  if (method === "html" || method === "pdf" || method === "ical" || method === "manual") {
    return method;
  }

  return "manual";
}

function parseMetadata(metadataJson: string) {
  try {
    const parsed = JSON.parse(metadataJson) as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function buildSourceFailureMessage(sourceFailures: IngestSourceFailure[]) {
  if (sourceFailures.length === 0) {
    return "Unknown ingest failure";
  }

  return sourceFailures
    .map((failure) => `${failure.sourceSlug}: ${failure.message}`)
    .join("; ");
}
