import type { ContentDecision, MunicipalityConfig, NormalizedSourceItem, SourceConfig } from "@thelocalrecord/core";

import { municipalities, sourceRegistry } from "@thelocalrecord/core";

import type { D1Database } from "./cloudflare";

type QueryResult<T> = Promise<T | null>;

type PublishedRow = {
  id: string;
  title: string;
  summary: string;
  category: string;
  risk_level: string;
  review_state: string;
  source_links_json: string;
  extraction_note: string | null;
  published_at: string;
  source_material_date: string | null;
  source_name: string;
};

export type SearchablePublishedEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source_links_json: string;
  published_at: string;
  source_material_date: string | null;
  source_name: string;
  normalized_text: string;
};

function publishedCategoryPrioritySql() {
  return `CASE content_entry.category
    WHEN 'official_alert' THEN 1
    WHEN 'official_news' THEN 2
    WHEN 'service_notice' THEN 3
    WHEN 'agenda_posted' THEN 4
    WHEN 'approved_minutes' THEN 5
    WHEN 'planning_zoning' THEN 6
    WHEN 'calendar_update' THEN 7
    WHEN 'meeting_notice' THEN 8
    ELSE 9
  END`;
}

function nowIso() {
  return new Date().toISOString();
}

export async function syncRegistry(db: D1Database) {
  const now = nowIso();

  for (const municipality of municipalities) {
    await upsertMunicipality(db, municipality, now);
  }

  for (const source of sourceRegistry) {
    await upsertSource(db, source, now);
  }
}

async function upsertMunicipality(db: D1Database, municipality: MunicipalityConfig, now: string) {
  await db
    .prepare(
      `INSERT INTO municipality (
        slug, name, state, locality_type, short_name, disclaimer, about, corrections_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        state = excluded.state,
        locality_type = excluded.locality_type,
        short_name = excluded.short_name,
        disclaimer = excluded.disclaimer,
        about = excluded.about,
        corrections_email = excluded.corrections_email,
        updated_at = excluded.updated_at`
    )
    .bind(
      municipality.slug,
      municipality.name,
      municipality.state,
      municipality.localityType,
      municipality.shortName,
      municipality.disclaimer,
      municipality.about,
      municipality.correctionsEmail,
      now,
      now
    )
    .run();
}

async function upsertSource(db: D1Database, source: SourceConfig, now: string) {
  await db
    .prepare(
      `INSERT INTO source (
        slug, municipality_slug, name, description, url, kind, fetch_strategy, implemented, public_category, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        municipality_slug = excluded.municipality_slug,
        name = excluded.name,
        description = excluded.description,
        url = excluded.url,
        kind = excluded.kind,
        fetch_strategy = excluded.fetch_strategy,
        implemented = excluded.implemented,
        public_category = excluded.public_category,
        updated_at = excluded.updated_at`
    )
    .bind(
      source.slug,
      source.municipalitySlug,
      source.name,
      source.description,
      source.url,
      source.kind,
      source.fetchStrategy,
      source.implemented ? 1 : 0,
      source.publicCategory,
      now,
      now
    )
    .run();
}

export async function createFetchRun(db: D1Database, municipalitySlug: string) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO fetch_run (id, municipality_slug, status, started_at) VALUES (?, ?, ?, ?)"
    )
    .bind(id, municipalitySlug, "running", nowIso())
    .run();

  return id;
}

export async function completeFetchRun(
  db: D1Database,
  fetchRunId: string,
  status: "completed" | "failed",
  stats: Record<string, number>,
  errorMessage?: string
) {
  await db
    .prepare(
      "UPDATE fetch_run SET status = ?, completed_at = ?, stats_json = ?, error_message = ? WHERE id = ?"
    )
    .bind(status, nowIso(), JSON.stringify(stats), errorMessage ?? null, fetchRunId)
    .run();
}

export async function attachArtifactRecord(
  db: D1Database,
  args: {
    fetchRunId: string;
    sourceSlug: string;
    kind: string;
    storageKey: string;
    url: string;
    sha256: string;
    mimeType?: string;
    sourceItemId?: string;
  }
) {
  await db
    .prepare(
      `INSERT INTO artifact (
        id, fetch_run_id, source_slug, source_item_id, kind, storage_key, url, sha256, mime_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      args.fetchRunId,
      args.sourceSlug,
      args.sourceItemId ?? null,
      args.kind,
      args.storageKey,
      args.url,
      args.sha256,
      args.mimeType ?? null,
      nowIso()
    )
    .run();
}

async function findExistingSourceItem(
  db: D1Database,
  sourceSlug: string,
  externalId: string
): QueryResult<{ id: string; content_hash: string }> {
  return db
    .prepare("SELECT id, content_hash FROM source_item WHERE source_slug = ? AND external_id = ?")
    .bind(sourceSlug, externalId)
    .first<{ id: string; content_hash: string }>();
}

export async function persistNormalizedItem(
  db: D1Database,
  args: {
    item: NormalizedSourceItem;
    decision: ContentDecision;
    fetchRunId: string;
  }
) {
  const now = nowIso();
  const existing = await findExistingSourceItem(db, args.item.sourceSlug, args.item.externalId);

  if (!existing) {
    const sourceItemId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO source_item (
          id, municipality_slug, source_slug, external_id, title, source_url, source_page_url, normalized_text,
          published_at, event_date, content_hash, metadata_json, extraction_method, extraction_confidence,
          extraction_note, first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        sourceItemId,
        args.item.municipalitySlug,
        args.item.sourceSlug,
        args.item.externalId,
        args.item.title,
        args.item.sourceUrl,
        args.item.sourcePageUrl,
        args.item.normalizedText,
        args.item.publishedAt ?? null,
        args.item.eventDate ?? null,
        args.item.contentHash,
        JSON.stringify(args.item.metadata),
        args.item.extraction.method,
        args.item.extraction.confidence,
        args.item.extraction.note ?? null,
        now,
        now,
        now,
        now
      )
      .run();

    return createDiffAndContent(db, {
      item: args.item,
      decision: args.decision,
      fetchRunId: args.fetchRunId,
      sourceItemId,
      previousHash: null,
      eventType: "created"
    });
  }

  if (existing.content_hash === args.item.contentHash) {
    await db
      .prepare("UPDATE source_item SET last_seen_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, existing.id)
      .run();

    return null;
  }

  await db
    .prepare(
      `UPDATE source_item SET
        title = ?, source_url = ?, source_page_url = ?, normalized_text = ?, published_at = ?, event_date = ?,
        content_hash = ?, metadata_json = ?, extraction_method = ?, extraction_confidence = ?, extraction_note = ?,
        last_seen_at = ?, updated_at = ?
      WHERE id = ?`
    )
    .bind(
      args.item.title,
      args.item.sourceUrl,
      args.item.sourcePageUrl,
      args.item.normalizedText,
      args.item.publishedAt ?? null,
      args.item.eventDate ?? null,
      args.item.contentHash,
      JSON.stringify(args.item.metadata),
      args.item.extraction.method,
      args.item.extraction.confidence,
      args.item.extraction.note ?? null,
      now,
      now,
      existing.id
    )
    .run();

  return createDiffAndContent(db, {
    item: args.item,
    decision: args.decision,
    fetchRunId: args.fetchRunId,
    sourceItemId: existing.id,
    previousHash: existing.content_hash,
    eventType: "updated"
  });
}

async function createDiffAndContent(
  db: D1Database,
  args: {
    item: NormalizedSourceItem;
    decision: ContentDecision;
    fetchRunId: string;
    sourceItemId: string;
    previousHash: string | null;
    eventType: "created" | "updated";
  }
) {
  const now = nowIso();
  const diffEventId = crypto.randomUUID();
  const contentEntryId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO diff_event (
        id, municipality_slug, fetch_run_id, source_item_id, event_type, previous_hash, current_hash,
        title, classification, risk_level, review_state, rationale_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      diffEventId,
      args.item.municipalitySlug,
      args.fetchRunId,
      args.sourceItemId,
      args.eventType,
      args.previousHash,
      args.item.contentHash,
      args.item.title,
      args.decision.classification,
      args.decision.riskLevel,
      args.decision.reviewState,
      JSON.stringify(args.decision.rationale),
      now
    )
    .run();

  await db
    .prepare(
      `INSERT INTO content_entry (
        id, municipality_slug, source_item_id, diff_event_id, title, summary, category,
        risk_level, review_state, source_links_json, extraction_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      contentEntryId,
      args.item.municipalitySlug,
      args.sourceItemId,
      diffEventId,
      args.item.title,
      args.decision.summary,
      args.decision.classification,
      args.decision.riskLevel,
      args.decision.reviewState,
      JSON.stringify([
        { label: "Source item", url: args.item.sourceUrl },
        { label: "Source page", url: args.item.sourcePageUrl }
      ]),
      args.decision.extractionNote ?? null,
      now,
      now
    )
    .run();

  if (args.decision.autoPublishAllowed) {
    await db
      .prepare(
        "INSERT INTO publication (id, content_entry_id, path, status, published_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        contentEntryId,
        `/${args.item.municipalitySlug}#${contentEntryId}`,
        "published",
        now
      )
      .run();
  }

  return diffEventId;
}

export async function listPublishedEntries(db: D1Database, slug: string, page = 1, pageSize = 10) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 50);
  const offset = (safePage - 1) * safePageSize;
  const feedPrioritySql = publishedCategoryPrioritySql();
  const totalRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT content_entry.source_item_id) as total
      FROM content_entry
      INNER JOIN publication ON publication.content_entry_id = content_entry.id
      WHERE content_entry.municipality_slug = ?`
    )
    .bind(slug)
    .first<{ total: number }>();
  const result = await db
    .prepare(
      `WITH ranked_publications AS (
        SELECT
          content_entry.id,
          content_entry.source_item_id,
          content_entry.title,
          content_entry.summary,
          content_entry.category,
          content_entry.risk_level,
          content_entry.review_state,
          content_entry.source_links_json,
          content_entry.extraction_note,
          publication.published_at,
          COALESCE(source_item.event_date, source_item.published_at, publication.published_at) as source_material_date,
          ${feedPrioritySql} as feed_priority,
          source.name as source_name,
          ROW_NUMBER() OVER (
            PARTITION BY content_entry.source_item_id
            ORDER BY publication.published_at DESC
          ) as row_number
        FROM content_entry
        INNER JOIN publication ON publication.content_entry_id = content_entry.id
        INNER JOIN source_item ON source_item.id = content_entry.source_item_id
        INNER JOIN source ON source.slug = source_item.source_slug
        WHERE content_entry.municipality_slug = ?
      )
      SELECT
        id,
        title,
        summary,
        category,
        risk_level,
        review_state,
        source_links_json,
        extraction_note,
        published_at,
        source_material_date,
        source_name
      FROM ranked_publications
      WHERE row_number = 1
      ORDER BY feed_priority ASC, source_material_date DESC, published_at DESC
      LIMIT ? OFFSET ?`
    )
    .bind(slug, safePageSize, offset)
    .all<PublishedRow>();

  return {
    entries: result.results ?? [],
    total: totalRow?.total ?? 0,
    page: safePage,
    pageSize: safePageSize
  };
}

export async function listReviewQueue(db: D1Database, slug: string) {
  const result = await db
    .prepare(
      `SELECT
        id, title, summary, category, extraction_note, review_state, source_links_json
      FROM content_entry
      WHERE municipality_slug = ? AND review_state = 'review_required'
      ORDER BY created_at DESC`
    )
    .bind(slug)
    .all<Record<string, string>>();

  return result.results ?? [];
}

function tokenizeSearchQuery(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3)
    .slice(0, 8);
}

function scoreSearchableEntry(entry: SearchablePublishedEntry, query: string, terms: string[]) {
  const title = entry.title.toLowerCase();
  const summary = entry.summary.toLowerCase();
  const body = `${entry.normalized_text} ${entry.category} ${entry.source_name}`.toLowerCase();
  let score = 0;

  if (query && title.includes(query)) {
    score += 12;
  }

  if (query && summary.includes(query)) {
    score += 8;
  }

  if (query && body.includes(query)) {
    score += 5;
  }

  for (const term of terms) {
    if (title.includes(term)) {
      score += 4;
    }

    if (summary.includes(term)) {
      score += 3;
    }

    if (body.includes(term)) {
      score += 2;
    }
  }

  if (entry.category === "official_news" || entry.category === "official_alert") {
    score += 1;
  }

  return score;
}

export async function searchPublishedEntries(
  db: D1Database,
  slug: string,
  query: string,
  limit = 6
) {
  const normalizedQuery = query.trim().toLowerCase();
  const terms = tokenizeSearchQuery(normalizedQuery);

  if (!normalizedQuery || terms.length === 0) {
    return [] as SearchablePublishedEntry[];
  }

  const result = await db
    .prepare(
      `WITH ranked_publications AS (
        SELECT
          content_entry.id,
          content_entry.source_item_id,
          content_entry.title,
          content_entry.summary,
          content_entry.category,
          content_entry.source_links_json,
          publication.published_at,
          COALESCE(source_item.event_date, source_item.published_at, publication.published_at) as source_material_date,
          source.name as source_name,
          source_item.normalized_text,
          ROW_NUMBER() OVER (
            PARTITION BY content_entry.source_item_id
            ORDER BY publication.published_at DESC
          ) as row_number
        FROM content_entry
        INNER JOIN publication ON publication.content_entry_id = content_entry.id
        INNER JOIN source_item ON source_item.id = content_entry.source_item_id
        INNER JOIN source ON source.slug = source_item.source_slug
        WHERE content_entry.municipality_slug = ?
      )
      SELECT
        id,
        title,
        summary,
        category,
        source_links_json,
        published_at,
        source_material_date,
        source_name,
        normalized_text
      FROM ranked_publications
      WHERE row_number = 1
      ORDER BY published_at DESC
      LIMIT 150`
    )
    .bind(slug)
    .all<SearchablePublishedEntry>();

  return (result.results ?? [])
    .map((entry) => ({
      entry,
      score: scoreSearchableEntry(entry, normalizedQuery, terms)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.entry.published_at.localeCompare(left.entry.published_at);
    })
    .slice(0, limit)
    .map((candidate) => candidate.entry);
}
