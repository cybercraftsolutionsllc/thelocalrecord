import { evaluateItem } from "@thelocalrecord/content";
import { getMunicipalityBySlug, getSourcesForMunicipality, hashContent } from "@thelocalrecord/core";
import { parseAgendaCenter, parseAlertCenter, parseNewsFlash } from "@thelocalrecord/ingest/adapters";

import { attachArtifactRecord, completeFetchRun, createFetchRun, persistNormalizedItem, syncRegistry } from "./d1";
import type { WorkerEnv } from "./env";
import { maybeRefineSummaryWithOpenAI } from "./openai";

export async function ingestMunicipality(env: WorkerEnv, slug: string) {
  const municipality = getMunicipalityBySlug(slug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${slug}`);
  }

  await syncRegistry(env.DB);
  const fetchRunId = await createFetchRun(env.DB, slug);
  const stats = {
    sourcesFetched: 0,
    itemsSeen: 0,
    diffEventsCreated: 0
  };

  try {
    for (const source of getSourcesForMunicipality(slug).filter((entry) => entry.implemented)) {
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

      const items = selectAdapter(source.slug, body, source.url);
      stats.sourcesFetched += 1;
      stats.itemsSeen += items.length;

      for (const item of items) {
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
    }

    await completeFetchRun(env.DB, fetchRunId, "completed", stats);
    return stats;
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

function buildArtifactKey(municipalitySlug: string, sourceSlug: string, fetchRunId: string) {
  const datePath = new Date().toISOString().slice(0, 10);
  return `${municipalitySlug}/${sourceSlug}/${datePath}/${fetchRunId}.html`;
}
