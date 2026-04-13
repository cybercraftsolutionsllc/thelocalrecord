import type { ContentDecision, MunicipalityConfig, NormalizedSourceItem, SourceConfig } from "@thelocalrecord/core";
import { createHash } from "node:crypto";

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
  topic_text: string;
};

export type PublishedEntryDetail = PublishedRow;

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

export type StoredSourceItemRecord = {
  id: string;
  municipality_slug: string;
  source_slug: string;
  external_id: string;
  title: string;
  source_url: string;
  source_page_url: string;
  normalized_text: string;
  published_at: string | null;
  event_date: string | null;
  content_hash: string;
  metadata_json: string;
  extraction_method: string;
  extraction_confidence: number;
  extraction_note: string | null;
};

export type NewsletterSubscriptionRecord = {
  id: string;
  municipality_slug: string;
  email: string;
  display_name: string | null;
  status: string;
  frequency: string;
  manage_token: string;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  last_sent_issue_id: string | null;
  last_sent_at: string | null;
};

type NewsletterTokenRecord = {
  id: string;
  subscription_id: string;
  token_kind: string;
  token_hash: string;
  created_at: string;
  consumed_at: string | null;
  expires_at: string | null;
};

type RateLimitRecord = {
  id: string;
  route_key: string;
  identifier: string;
  bucket_start: string;
  request_count: number;
  updated_at: string;
  expires_at: string;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export type NewsletterDigestEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source_links_json: string;
  published_at: string;
  source_material_date: string | null;
  source_name: string;
  topic_text: string;
};

export type NewsletterIssueRecord = {
  id: string;
  municipality_slug: string;
  week_key: string;
  period_start: string;
  period_end: string;
  subject: string;
  intro: string;
  entries_json: string;
  status: string;
  delivery_notes: string | null;
  created_at: string;
  sent_at: string | null;
};

function publishedCategoryPrioritySql(columnName = "content_entry.category") {
  return `CASE ${columnName}
    WHEN 'official_alert' THEN 1
    WHEN 'official_news' THEN 2
    WHEN 'approved_minutes' THEN 3
    WHEN 'planning_zoning' THEN 4
    WHEN 'meeting_notice' THEN 5
    WHEN 'calendar_update' THEN 6
    WHEN 'agenda_posted' THEN 7
    WHEN 'service_notice' THEN 8
    ELSE 9
  END`;
}

function nowIso() {
  return new Date().toISOString();
}

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function placeholderLegacyToken() {
  return `legacy-disabled-${crypto.randomUUID()}`;
}

const STALE_FETCH_RUN_MINUTES = 45;

export class ActiveFetchRunError extends Error {
  constructor(
    readonly fetchRunId: string,
    readonly startedAt: string
  ) {
    super(`Fetch run ${fetchRunId} is already running for this municipality.`);
    this.name = "ActiveFetchRunError";
  }
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
  await expireStaleFetchRuns(db, municipalitySlug);
  await assertNoActiveFetchRun(db, municipalitySlug);

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO fetch_run (id, municipality_slug, status, started_at) VALUES (?, ?, ?, ?)"
    )
    .bind(id, municipalitySlug, "running", nowIso())
    .run();

  return id;
}

async function assertNoActiveFetchRun(db: D1Database, municipalitySlug: string) {
  const active = await db
    .prepare(
      `SELECT id, started_at
      FROM fetch_run
      WHERE municipality_slug = ? AND status = ?
      ORDER BY started_at DESC
      LIMIT 1`
    )
    .bind(municipalitySlug, "running")
    .first<{ id: string; started_at: string }>();

  if (active) {
    throw new ActiveFetchRunError(active.id, active.started_at);
  }
}

async function expireStaleFetchRuns(db: D1Database, municipalitySlug: string) {
  const cutoff = new Date(Date.now() - STALE_FETCH_RUN_MINUTES * 60 * 1000).toISOString();

  await db
    .prepare(
      `UPDATE fetch_run
      SET status = ?, completed_at = ?, error_message = ?, stats_json = COALESCE(stats_json, ?)
      WHERE municipality_slug = ? AND status = ? AND started_at < ?`
    )
    .bind(
      "failed",
      nowIso(),
      `Marked failed after exceeding ${STALE_FETCH_RUN_MINUTES} minutes without completion.`,
      JSON.stringify({
        sourcesFetched: 0,
        itemsSeen: 0,
        diffEventsCreated: 0
      }),
      municipalitySlug,
      "running",
      cutoff
    )
    .run();
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

export async function findExistingSourceItem(
  db: D1Database,
  sourceSlug: string,
  externalId: string
): QueryResult<{ id: string; content_hash: string }> {
  return db
    .prepare("SELECT id, content_hash FROM source_item WHERE source_slug = ? AND external_id = ?")
    .bind(sourceSlug, externalId)
    .first<{ id: string; content_hash: string }>();
}

export async function touchSourceItem(db: D1Database, sourceItemId: string) {
  const now = nowIso();

  await db
    .prepare("UPDATE source_item SET last_seen_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, sourceItemId)
    .run();
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
          substr(source_item.normalized_text, 1, 4000) as topic_text,
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
        source_name,
        topic_text
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

export async function getPublishedEntryById(
  db: D1Database,
  slug: string,
  entryId: string
) {
  const result = await db
    .prepare(
      `SELECT
        content_entry.id,
        content_entry.title,
        content_entry.summary,
        content_entry.category,
        content_entry.risk_level,
        content_entry.review_state,
        content_entry.source_links_json,
        content_entry.extraction_note,
        publication.published_at,
        COALESCE(source_item.event_date, source_item.published_at, publication.published_at) as source_material_date,
        source.name as source_name,
        substr(source_item.normalized_text, 1, 12000) as topic_text
      FROM content_entry
      INNER JOIN publication ON publication.content_entry_id = content_entry.id
      INNER JOIN source_item ON source_item.id = content_entry.source_item_id
      INNER JOIN source ON source.slug = source_item.source_slug
      WHERE content_entry.municipality_slug = ? AND content_entry.id = ?
      LIMIT 1`
    )
    .bind(slug, entryId)
    .first<PublishedEntryDetail>();

  return result ?? null;
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
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "about",
    "currently",
    "do",
    "for",
    "from",
    "how",
    "i",
    "if",
    "in",
    "indexed",
    "is",
    "it",
    "local",
    "locality",
    "manheim",
    "municipal",
    "municipality",
    "of",
    "on",
    "or",
    "records",
    "say",
    "says",
    "tell",
    "that",
    "the",
    "their",
    "there",
    "these",
    "this",
    "township",
    "what",
    "which",
    "with"
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !stopWords.has(term))
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

  if (isHousingIntent(query, terms)) {
    if (isHousingOrGrowthEntry(title, summary, body)) {
      score += 10;
    }

    if (entry.category === "planning_zoning") {
      score += 4;
    }
  }

  if (isDevelopmentIntent(query, terms)) {
    if (entry.category === "planning_zoning") {
      score += 5;
    }

    if (isDevelopmentEntry(title, summary, body)) {
      score += 6;
    }
  }

  if (score > 0 && (entry.category === "official_news" || entry.category === "official_alert")) {
    score += 1;
  }

  return score;
}

const HOUSING_TERMS = [
  "housing",
  "residential",
  "dwelling",
  "dwelling unit",
  "apartment",
  "apartments",
  "townhome",
  "townhomes",
  "multifamily",
  "multi family",
  "single-family",
  "single family",
  "subdivision",
  "homebuilding",
  "home construction",
  "senior living",
  "affordable housing",
  "accessory dwelling unit"
];

const DEVELOPMENT_TERMS = [
  "development",
  "land development",
  "subdivision",
  "rezoning",
  "variance",
  "conditional use",
  "planning",
  "zoning",
  "hearing",
  "ordinance amendment",
  "site plan"
];

function isHousingIntent(query: string, terms: string[]) {
  return includesPhraseOrTerm(query, terms, HOUSING_TERMS);
}

function isDevelopmentIntent(query: string, terms: string[]) {
  return includesPhraseOrTerm(query, terms, DEVELOPMENT_TERMS);
}

function includesPhraseOrTerm(query: string, terms: string[], patterns: string[]) {
  return patterns.some((pattern) => {
    return query.includes(pattern) || terms.includes(pattern);
  });
}

function isHousingOrGrowthEntry(title: string, summary: string, body: string) {
  return includesInAny([title, summary, body], HOUSING_TERMS);
}

function isDevelopmentEntry(title: string, summary: string, body: string) {
  return includesInAny([title, summary, body], DEVELOPMENT_TERMS);
}

function includesInAny(values: string[], patterns: string[]) {
  return values.some((value) => patterns.some((pattern) => value.includes(pattern)));
}

function compactSearchText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitSearchSentences(text: string) {
  return compactSearchText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40);
}

function searchSummaryPrefix(category: string) {
  switch (category) {
    case "approved_minutes":
      return "According to the posted meeting minutes, ";
    case "agenda_posted":
      return "According to the posted agenda, ";
    case "meeting_notice":
      return "According to the posted meeting notice, ";
    case "calendar_update":
      return "According to the public calendar listing, ";
    case "official_alert":
      return "According to the official alert, ";
    default:
      return "";
  }
}

function scoreSearchSnippetSentence(sentence: string, query: string, terms: string[]) {
  const lower = sentence.toLowerCase();
  let score = 0;

  if (lower.includes(query)) {
    score += 12;
  }

  for (const term of terms) {
    if (lower.includes(term)) {
      score += 4;
    }
  }

    if (
      /presented the plan|proposes|proposed|subdivision|land development|rezoning|variance|conditional use|ordinance|hearing|single family|mixed-use|townhome|apartment|dwelling|table the plan|recommend approval/i.test(
        sentence
      )
    ) {
      score += 5;
    }

    if (/117 lots|111 lots|open space lots|rgs associates|site is located/i.test(sentence)) {
      score += 4;
    }

    if (/approve the minutes|roll call|call to order|adjournment|members present/i.test(sentence)) {
      score -= 6;
    }

    if (/public comment|focused discussions|no motions were made|\.\.\.\.\.\.\.\./i.test(sentence)) {
      score -= 4;
    }

    return score;
  }

function buildSearchSnippet(entry: SearchablePublishedEntry, query: string, terms: string[]) {
  const sentences = splitSearchSentences(entry.normalized_text);
  const bestSentence = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreSearchSnippetSentence(sentence, query, terms)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0];

  if (!bestSentence) {
    return entry.summary;
  }

  const prefix = searchSummaryPrefix(entry.category);
  const snippet = `${prefix}${bestSentence.sentence}`;

  if (snippet.length <= 320) {
    return snippet;
  }

  return `${snippet.slice(0, 317).trimEnd()}...`;
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
      LIMIT 250`
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
    .map((candidate) => ({
      ...candidate.entry,
      summary: buildSearchSnippet(candidate.entry, normalizedQuery, terms)
    }));
}

export async function listSourceItemsForMunicipality(
  db: D1Database,
  slug: string,
  sourceSlugs: string[]
) {
  if (sourceSlugs.length === 0) {
    return [] as StoredSourceItemRecord[];
  }

  const placeholders = sourceSlugs.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        source_slug,
        external_id,
        title,
        source_url,
        source_page_url,
        normalized_text,
        published_at,
        event_date,
        content_hash,
        metadata_json,
        extraction_method,
        extraction_confidence,
        extraction_note
      FROM source_item
      WHERE municipality_slug = ? AND source_slug IN (${placeholders})
      ORDER BY COALESCE(event_date, published_at, created_at) DESC`
    )
    .bind(slug, ...sourceSlugs)
    .all<StoredSourceItemRecord>();

  return result.results ?? [];
}

export async function updateContentEntriesForSourceItem(
  db: D1Database,
  args: {
    sourceItemId: string;
    summary: string;
    category: string;
    riskLevel: string;
    reviewState: string;
    extractionNote?: string;
  }
) {
  await db
    .prepare(
      `UPDATE content_entry
      SET
        summary = ?,
        category = ?,
        risk_level = ?,
        review_state = ?,
        extraction_note = ?,
        updated_at = ?
      WHERE source_item_id = ?`
    )
    .bind(
      args.summary,
      args.category,
      args.riskLevel,
      args.reviewState,
      args.extractionNote ?? null,
      nowIso(),
      args.sourceItemId
    )
    .run();
}

export async function upsertNewsletterSubscription(
  db: D1Database,
  args: {
    municipalitySlug: string;
    email: string;
    displayName?: string;
  }
) {
  const normalizedEmail = normalizeEmailAddress(args.email);
  const existing = await db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        email,
        display_name,
        status,
        frequency,
        manage_token,
        unsubscribe_token,
        created_at,
        updated_at,
        confirmed_at,
        unsubscribed_at,
        last_sent_issue_id,
        last_sent_at
      FROM newsletter_subscription
      WHERE municipality_slug = ? AND email = ?`
    )
    .bind(args.municipalitySlug, normalizedEmail)
    .first<NewsletterSubscriptionRecord>();

  const now = nowIso();

  if (existing) {
    const displayName = args.displayName?.trim() || existing.display_name;
    const nextStatus = existing.status === "active" ? "active" : "pending_confirm";

    await db
      .prepare(
        `UPDATE newsletter_subscription
        SET
          display_name = ?,
          status = ?,
          updated_at = ?,
          unsubscribed_at = CASE WHEN ? = 'pending_confirm' THEN NULL ELSE unsubscribed_at END
        WHERE id = ?`
      )
      .bind(displayName ?? null, nextStatus, now, nextStatus, existing.id)
      .run();

    return {
      ...existing,
      display_name: displayName ?? null,
      status: nextStatus,
      updated_at: now,
      unsubscribed_at: nextStatus === "pending_confirm" ? null : existing.unsubscribed_at
    } satisfies NewsletterSubscriptionRecord;
  }

  const created = {
    id: crypto.randomUUID(),
    municipality_slug: args.municipalitySlug,
    email: normalizedEmail,
    display_name: args.displayName?.trim() || null,
    status: "pending_confirm",
    frequency: "weekly",
    manage_token: placeholderLegacyToken(),
    unsubscribe_token: placeholderLegacyToken(),
    created_at: now,
    updated_at: now,
    confirmed_at: null,
    unsubscribed_at: null,
    last_sent_issue_id: null,
    last_sent_at: null
  } satisfies NewsletterSubscriptionRecord;

  await db
    .prepare(
      `INSERT INTO newsletter_subscription (
        id, municipality_slug, email, display_name, status, frequency, manage_token, unsubscribe_token,
        created_at, updated_at, confirmed_at, unsubscribed_at, last_sent_issue_id, last_sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      created.id,
      created.municipality_slug,
      created.email,
      created.display_name,
      created.status,
      created.frequency,
      created.manage_token,
      created.unsubscribe_token,
      created.created_at,
      created.updated_at,
      created.confirmed_at,
      created.unsubscribed_at,
      created.last_sent_issue_id,
      created.last_sent_at
    )
    .run();

  return created;
}

async function getNewsletterSubscriptionByEmail(
  db: D1Database,
  municipalitySlug: string,
  email: string
) {
  return db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        email,
        display_name,
        status,
        frequency,
        manage_token,
        unsubscribe_token,
        created_at,
        updated_at,
        confirmed_at,
        unsubscribed_at,
        last_sent_issue_id,
        last_sent_at
      FROM newsletter_subscription
      WHERE municipality_slug = ? AND email = ?`
    )
    .bind(municipalitySlug, normalizeEmailAddress(email))
    .first<NewsletterSubscriptionRecord>();
}

async function createNewsletterTokenRecord(
  db: D1Database,
  args: {
    subscriptionId: string;
    tokenKind: "manage" | "confirm";
    expiresAt?: string | null;
  }
) {
  const rawToken = crypto.randomUUID();
  const now = nowIso();

  await db
    .prepare(
      `DELETE FROM newsletter_token
      WHERE subscription_id = ? AND token_kind = ?`
    )
    .bind(args.subscriptionId, args.tokenKind)
    .run();

  await db
    .prepare(
      `INSERT INTO newsletter_token (
        id, subscription_id, token_kind, token_hash, created_at, consumed_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      args.subscriptionId,
      args.tokenKind,
      hashOpaqueToken(rawToken),
      now,
      null,
      args.expiresAt ?? null
    )
    .run();

  return rawToken;
}

async function getNewsletterTokenRecord(
  db: D1Database,
  args: {
    token: string;
    tokenKind: "manage" | "confirm";
  }
) {
  return db
    .prepare(
      `SELECT
        id,
        subscription_id,
        token_kind,
        token_hash,
        created_at,
        consumed_at,
        expires_at
      FROM newsletter_token
      WHERE
        token_kind = ?
        AND token_hash = ?
        AND consumed_at IS NULL
        AND (expires_at IS NULL OR expires_at > ?)`
    )
    .bind(args.tokenKind, hashOpaqueToken(args.token), nowIso())
    .first<NewsletterTokenRecord>();
}

async function markNewsletterTokenConsumed(db: D1Database, tokenId: string) {
  await db
    .prepare(
      `UPDATE newsletter_token
      SET consumed_at = ?
      WHERE id = ?`
    )
    .bind(nowIso(), tokenId)
    .run();
}

export async function issueNewsletterManageToken(db: D1Database, subscriptionId: string) {
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return createNewsletterTokenRecord(db, {
    subscriptionId,
    tokenKind: "manage",
    expiresAt
  });
}

export async function issueNewsletterConfirmationToken(
  db: D1Database,
  args: {
    municipalitySlug: string;
    email: string;
  }
) {
  const subscription = await getNewsletterSubscriptionByEmail(
    db,
    args.municipalitySlug,
    args.email
  );

  if (!subscription) {
    return null;
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const token = await createNewsletterTokenRecord(db, {
    subscriptionId: subscription.id,
    tokenKind: "confirm",
    expiresAt
  });

  return {
    subscription,
    token
  };
}

export async function getNewsletterSubscriptionByManageToken(
  db: D1Database,
  manageToken: string
) {
  const tokenRecord = await getNewsletterTokenRecord(db, {
    token: manageToken,
    tokenKind: "manage"
  });

  if (tokenRecord) {
    return db
      .prepare(
        `SELECT
          id,
          municipality_slug,
          email,
          display_name,
          status,
          frequency,
          manage_token,
          unsubscribe_token,
          created_at,
          updated_at,
          confirmed_at,
          unsubscribed_at,
          last_sent_issue_id,
          last_sent_at
        FROM newsletter_subscription
        WHERE id = ?`
      )
      .bind(tokenRecord.subscription_id)
      .first<NewsletterSubscriptionRecord>();
  }

  return db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        email,
        display_name,
        status,
        frequency,
        manage_token,
        unsubscribe_token,
        created_at,
        updated_at,
        confirmed_at,
        unsubscribed_at,
        last_sent_issue_id,
        last_sent_at
      FROM newsletter_subscription
      WHERE manage_token = ?`
    )
    .bind(manageToken)
    .first<NewsletterSubscriptionRecord>();
}

export async function getNewsletterSubscriptionByConfirmationToken(
  db: D1Database,
  confirmationToken: string
) {
  const tokenRecord = await getNewsletterTokenRecord(db, {
    token: confirmationToken,
    tokenKind: "confirm"
  });

  if (!tokenRecord) {
    return null;
  }

  const subscription = await db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        email,
        display_name,
        status,
        frequency,
        manage_token,
        unsubscribe_token,
        created_at,
        updated_at,
        confirmed_at,
        unsubscribed_at,
        last_sent_issue_id,
        last_sent_at
      FROM newsletter_subscription
      WHERE id = ?`
    )
    .bind(tokenRecord.subscription_id)
    .first<NewsletterSubscriptionRecord>();

  if (!subscription) {
    return null;
  }

  return {
    subscription,
    tokenRecord
  };
}

export async function confirmNewsletterSubscriptionByToken(
  db: D1Database,
  confirmationToken: string
) {
  const result = await getNewsletterSubscriptionByConfirmationToken(db, confirmationToken);

  if (!result) {
    return null;
  }

  const now = nowIso();
  await db
    .prepare(
      `UPDATE newsletter_subscription
      SET
        status = 'active',
        updated_at = ?,
        confirmed_at = COALESCE(confirmed_at, ?),
        unsubscribed_at = NULL
      WHERE id = ?`
    )
    .bind(now, now, result.subscription.id)
    .run();

  await markNewsletterTokenConsumed(db, result.tokenRecord.id);
  const manageToken = await issueNewsletterManageToken(db, result.subscription.id);

  return {
    subscription: {
      ...result.subscription,
      status: "active",
      updated_at: now,
      confirmed_at: result.subscription.confirmed_at ?? now,
      unsubscribed_at: null
    } satisfies NewsletterSubscriptionRecord,
    manageToken
  };
}

export async function updateNewsletterSubscriptionByManageToken(
  db: D1Database,
  args: {
    manageToken: string;
    displayName?: string;
    status?: "active" | "unsubscribed";
  }
) {
  const existing = await getNewsletterSubscriptionByManageToken(db, args.manageToken);

  if (!existing) {
    return null;
  }

  const nextStatus = args.status ?? existing.status;
  const nextDisplayName =
    args.displayName === undefined ? existing.display_name : args.displayName.trim() || null;
  const now = nowIso();

  await db
    .prepare(
      `UPDATE newsletter_subscription
      SET
        display_name = ?,
        status = ?,
        updated_at = ?,
        unsubscribed_at = ?,
        confirmed_at = CASE WHEN ? = 'active' THEN COALESCE(confirmed_at, ?) ELSE confirmed_at END
      WHERE id = ?`
    )
    .bind(
      nextDisplayName,
      nextStatus,
      now,
      nextStatus === "unsubscribed" ? now : null,
      nextStatus,
      now,
      existing.id
    )
    .run();

  return {
    ...existing,
    display_name: nextDisplayName,
    status: nextStatus,
    updated_at: now,
    unsubscribed_at: nextStatus === "unsubscribed" ? now : null,
    confirmed_at: nextStatus === "active" ? existing.confirmed_at ?? now : existing.confirmed_at
  } satisfies NewsletterSubscriptionRecord;
}

export async function listActiveNewsletterSubscriptions(db: D1Database, municipalitySlug: string) {
  const result = await db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        email,
        display_name,
        status,
        frequency,
        manage_token,
        unsubscribe_token,
        created_at,
        updated_at,
        confirmed_at,
        unsubscribed_at,
        last_sent_issue_id,
        last_sent_at
      FROM newsletter_subscription
      WHERE municipality_slug = ? AND status = 'active'
      ORDER BY created_at ASC`
    )
    .bind(municipalitySlug)
    .all<NewsletterSubscriptionRecord>();

  return result.results ?? [];
}

export async function resyncLegacyNewsletterTokens(db: D1Database) {
  const legacySubscriptions = await db
    .prepare(
      `SELECT id, manage_token, unsubscribe_token
      FROM newsletter_subscription
      WHERE manage_token IS NOT NULL AND manage_token NOT LIKE 'legacy-disabled-%'`
    )
    .all<{ id: string; manage_token: string; unsubscribe_token: string }>();

  for (const subscription of legacySubscriptions.results ?? []) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO newsletter_token (
          id, subscription_id, token_kind, token_hash, created_at, consumed_at, expires_at
        ) VALUES (?, ?, 'manage', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        subscription.id,
        hashOpaqueToken(subscription.manage_token),
        nowIso(),
        null,
        null
      )
      .run();

    await db
      .prepare(
        `UPDATE newsletter_subscription
        SET
          manage_token = ?,
          unsubscribe_token = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .bind(
        placeholderLegacyToken(),
        subscription.unsubscribe_token.startsWith("legacy-disabled-")
          ? subscription.unsubscribe_token
          : placeholderLegacyToken(),
        nowIso(),
        subscription.id
      )
      .run();
  }
}

export async function consumeRateLimit(
  db: D1Database,
  args: {
    routeKey: string;
    identifier: string;
    limit: number;
    windowMinutes: number;
  }
): Promise<RateLimitResult> {
  const now = new Date();
  const bucketMs = args.windowMinutes * 60 * 1000;
  const bucketStartDate = new Date(Math.floor(now.getTime() / bucketMs) * bucketMs);
  const bucketStart = bucketStartDate.toISOString();
  const expiresAt = new Date(bucketStartDate.getTime() + bucketMs).toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(`DELETE FROM request_rate_limit WHERE expires_at <= ?`)
    .bind(now.toISOString())
    .run();

  await db
    .prepare(
      `INSERT INTO request_rate_limit (
        id, route_key, identifier, bucket_start, request_count, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(route_key, identifier, bucket_start) DO UPDATE SET
        request_count = request_count + 1,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at`
    )
    .bind(id, args.routeKey, args.identifier, bucketStart, now.toISOString(), expiresAt)
    .run();

  const record = await db
    .prepare(
      `SELECT
        id,
        route_key,
        identifier,
        bucket_start,
        request_count,
        updated_at,
        expires_at
      FROM request_rate_limit
      WHERE route_key = ? AND identifier = ? AND bucket_start = ?`
    )
    .bind(args.routeKey, args.identifier, bucketStart)
    .first<RateLimitRecord>();

  const requestCount = record?.request_count ?? 0;
  const remaining = Math.max(0, args.limit - requestCount);
  const retryAfterSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000));

  return {
    allowed: requestCount <= args.limit,
    retryAfterSeconds,
    remaining
  };
}

export async function listNewsletterDigestEntries(
  db: D1Database,
  slug: string,
  args: {
    startIso: string;
    endIso: string;
    limit?: number;
  }
) {
  const limit = Math.min(Math.max(args.limit ?? 18, 1), 50);
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
          substr(source_item.normalized_text, 1, 5000) as topic_text,
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
        topic_text
      FROM ranked_publications
      WHERE
        row_number = 1
        AND source_material_date >= ?
        AND source_material_date < ?
      ORDER BY ${publishedCategoryPrioritySql("category")} ASC, source_material_date DESC, published_at DESC
      LIMIT ?`
    )
    .bind(slug, args.startIso, args.endIso, limit)
    .all<NewsletterDigestEntry>();

  return result.results ?? [];
}

export async function createOrUpdateNewsletterIssue(
  db: D1Database,
  args: {
    municipalitySlug: string;
    weekKey: string;
    periodStart: string;
    periodEnd: string;
    subject: string;
    intro: string;
    entriesJson: string;
    status: string;
    deliveryNotes?: string;
  }
) {
  const existing = await db
    .prepare(
      `SELECT
        id,
        municipality_slug,
        week_key,
        period_start,
        period_end,
        subject,
        intro,
        entries_json,
        status,
        delivery_notes,
        created_at,
        sent_at
      FROM newsletter_issue
      WHERE municipality_slug = ? AND week_key = ?`
    )
    .bind(args.municipalitySlug, args.weekKey)
    .first<NewsletterIssueRecord>();

  const now = nowIso();

  if (existing) {
    await db
      .prepare(
        `UPDATE newsletter_issue
        SET
          period_start = ?,
          period_end = ?,
          subject = ?,
          intro = ?,
          entries_json = ?,
          status = ?,
          delivery_notes = ?
        WHERE id = ?`
      )
      .bind(
        args.periodStart,
        args.periodEnd,
        args.subject,
        args.intro,
        args.entriesJson,
        args.status,
        args.deliveryNotes ?? null,
        existing.id
      )
      .run();

    return {
      ...existing,
      period_start: args.periodStart,
      period_end: args.periodEnd,
      subject: args.subject,
      intro: args.intro,
      entries_json: args.entriesJson,
      status: args.status,
      delivery_notes: args.deliveryNotes ?? null
    } satisfies NewsletterIssueRecord;
  }

  const created = {
    id: crypto.randomUUID(),
    municipality_slug: args.municipalitySlug,
    week_key: args.weekKey,
    period_start: args.periodStart,
    period_end: args.periodEnd,
    subject: args.subject,
    intro: args.intro,
    entries_json: args.entriesJson,
    status: args.status,
    delivery_notes: args.deliveryNotes ?? null,
    created_at: now,
    sent_at: null
  } satisfies NewsletterIssueRecord;

  await db
    .prepare(
      `INSERT INTO newsletter_issue (
        id, municipality_slug, week_key, period_start, period_end, subject, intro, entries_json,
        status, delivery_notes, created_at, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      created.id,
      created.municipality_slug,
      created.week_key,
      created.period_start,
      created.period_end,
      created.subject,
      created.intro,
      created.entries_json,
      created.status,
      created.delivery_notes,
      created.created_at,
      created.sent_at
    )
    .run();

  return created;
}

export async function markNewsletterIssueSent(
  db: D1Database,
  args: {
    issueId: string;
    status: string;
    deliveryNotes?: string;
  }
) {
  await db
    .prepare(
      `UPDATE newsletter_issue
      SET status = ?, delivery_notes = ?, sent_at = ?
      WHERE id = ?`
    )
    .bind(args.status, args.deliveryNotes ?? null, nowIso(), args.issueId)
    .run();
}

export async function recordNewsletterDelivery(
  db: D1Database,
  args: {
    subscriptionId: string;
    issueId: string;
  }
) {
  await db
    .prepare(
      `UPDATE newsletter_subscription
      SET last_sent_issue_id = ?, last_sent_at = ?, updated_at = ?
      WHERE id = ?`
    )
    .bind(args.issueId, nowIso(), nowIso(), args.subscriptionId)
    .run();
}

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}
