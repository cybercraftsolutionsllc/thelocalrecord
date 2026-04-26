import type {
  ContentDecision,
  NormalizedSourceItem
} from "@thelocalrecord/core";

import { compactText, contentDecisionSchema } from "@thelocalrecord/core";

const HIGH_RISK_TERMS = [
  "subdivision",
  "rezoning",
  "variance",
  "conditional use",
  "hearing",
  "ordinance amendment",
  "land development"
];

const DETAIL_PRIORITY_PATTERNS = [
  "ashford meadows",
  "wetherburn commons",
  "richmond square",
  "overlook north",
  "village of olde hickory",
  "preliminary/final",
  "preliminary subdivision",
  "final subdivision",
  "land development",
  "development plan",
  "concept plan",
  "residential",
  "housing",
  "dwelling",
  "single family",
  "apartment",
  "townhome",
  "mixed-use",
  "presented the plan",
  "proposes",
  "proposed",
  "public comment",
  "briefing",
  "action",
  "recommend approval",
  "recommend tabling",
  "table the plan",
  "ordinance",
  "hearing"
];

const DETAIL_LOW_SIGNAL_PATTERNS = [
  "roll call",
  "call to order",
  "pledge of allegiance",
  "approve the minutes",
  "approval of the minutes",
  "adjournment",
  "meeting was held",
  "members present",
  "scheduled for",
  "next planning commission meeting",
  "next board of commissioners meeting"
];

type EvaluateItemOptions = {
  officialSource?: boolean;
};

export type ExtractedEntryEntity = {
  entityKind:
    | "address"
    | "street"
    | "intersection"
    | "park"
    | "route"
    | "project"
    | "parcel_hint"
    | "meeting_date"
    | "source_category";
  label: string;
  normalizedValue: string;
  confidence: number;
};

export function classifyItem(
  item: NormalizedSourceItem
): ContentDecision["classification"] {
  const haystack = `${item.title} ${item.normalizedText}`.toLowerCase();

  if (item.sourceSlug === "alert-center") {
    return "official_alert";
  }

  if (item.sourceSlug === "township-news") {
    return "official_news";
  }

  if (item.sourceSlug === "code-news") {
    return "official_news";
  }

  if (item.sourceSlug === "calendar" || item.sourceSlug === "icalendar") {
    return "calendar_update";
  }

  if (
    item.sourceSlug === "planning-zoning" ||
    item.sourceSlug === "comprehensive-plan" ||
    item.sourceSlug === "planning-zoning-faq" ||
    item.sourceSlug === "planning-commission" ||
    item.sourceSlug === "zoning-hearing-board"
  ) {
    return "planning_zoning";
  }

  if (
    item.sourceSlug === "code-compliance" ||
    item.sourceSlug === "permit-faq"
  ) {
    return "service_notice";
  }

  if (/minutes/i.test(item.title)) {
    return "approved_minutes";
  }

  if (/agenda/i.test(item.title)) {
    return "agenda_posted";
  }

  if (/calendar|meeting/i.test(haystack)) {
    return "calendar_update";
  }

  if (/road|water|trash|utility|closure|service/i.test(haystack)) {
    return "service_notice";
  }

  if (
    /permit|code compliance|building code|certificate of use|occupancy|inspection|stormwater management plan|faq|ucc|icc/i.test(
      haystack
    )
  ) {
    return "service_notice";
  }

  if (HIGH_RISK_TERMS.some((term) => haystack.includes(term))) {
    return "planning_zoning";
  }

  return "meeting_notice";
}

export function inferImpactLevel(
  item: NormalizedSourceItem,
  classification: ContentDecision["classification"]
): ContentDecision["impactLevel"] {
  const haystack = `${item.title} ${item.normalizedText}`.toLowerCase();

  if (
    classification === "official_alert" &&
    /closure|closed|detour|water main|boil water|outage|emergency|evacuat|shelter|police|fire|flood|storm|snow emergency/i.test(
      haystack
    )
  ) {
    return "critical_source";
  }

  if (
    classification === "official_alert" ||
    /road|route|bridge|lane|traffic|detour|closure|closed|public works|water|sewer|trash|utility/i.test(
      haystack
    )
  ) {
    return "important";
  }

  if (
    classification === "planning_zoning" ||
    classification === "agenda_posted" ||
    /hearing|ordinance|agenda|permit|zoning|subdivision|land development|conditional use|variance|public notice|meeting/i.test(
      haystack
    )
  ) {
    return "important";
  }

  return "routine";
}

export function extractEntryEntities(
  item: NormalizedSourceItem
): ExtractedEntryEntity[] {
  const text = compactText(`${item.title}. ${item.normalizedText}`);
  const entities: ExtractedEntryEntity[] = [];

  collectMatches(
    text,
    /\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,5}\s+(?:Road|Rd|Street|St|Avenue|Ave|Pike|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Way|Circle|Cir|Trail|Trl|Highway|Hwy)\b/g,
    (match) => addEntity(entities, "address", match, 0.82)
  );

  collectMatches(text, /\b(?:Route|Rt\.?|PA|US)\s?\d{1,4}\b/g, (match) =>
    addEntity(entities, "route", match, 0.78)
  );

  collectMatches(
    text,
    /\b[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,4}\s+(?:Road|Rd|Street|St|Avenue|Ave|Pike|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Way)\b/g,
    (match) => addEntity(entities, "street", match, 0.62)
  );

  collectMatches(
    text,
    /\b[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,5}\s+(?:Park|Trail|Playground|Field|Preserve)\b/g,
    (match) => addEntity(entities, "park", match, 0.7)
  );

  collectMatches(
    text,
    /\b[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){1,5}\s+(?:Subdivision|Development|Commons|Meadows|Square|Village|Plan|Project)\b/g,
    (match) => addEntity(entities, "project", match, 0.72)
  );

  collectMatches(
    text,
    /\b(?:parcel|tax parcel|UPI|PIN)\s*(?:no\.?|number|#)?\s*[A-Z0-9.-]{4,}\b/gi,
    (match) => addEntity(entities, "parcel_hint", match, 0.68)
  );

  if (item.eventDate) {
    addEntity(entities, "meeting_date", item.eventDate.slice(0, 10), 0.9);
  }

  if (item.categoryHint) {
    addEntity(entities, "source_category", item.categoryHint, 0.75);
  }

  return entities.slice(0, 24);
}

export function summarizeItem(
  item: NormalizedSourceItem,
  classification: ContentDecision["classification"]
): string {
  const text = compactText(item.normalizedText);
  const detail = extractDetailSnippet(item.title, text);

  switch (classification) {
    case "agenda_posted":
      return detail
        ? `According to the posted agenda, ${detail}`
        : item.eventDate
          ? `According to the posted agenda listing, this item is scheduled for ${formatIsoDate(item.eventDate)}.`
          : `According to the posted agenda listing, this item is available from the township agenda portal.`;
    case "approved_minutes":
      return detail
        ? `According to the posted meeting minutes, ${detail}`
        : item.eventDate
          ? `According to the posted minutes listing, this record is tied to ${formatIsoDate(item.eventDate)}.`
          : `According to the posted minutes listing, this record is available through the township agenda portal.`;
    case "official_alert":
      return detail
        ? `According to the township alert, ${detail}`
        : `The township alert center lists this as an active public alert.`;
    case "official_news":
      return detail
        ? `According to the township news post, ${detail}`
        : `The township news feed lists this as an official news post.`;
    case "calendar_update":
      return detail
        ? `The township calendar lists ${detail}`
        : `The township calendar lists this as a public event or meeting update.`;
    case "service_notice":
      return detail
        ? `An official township source says ${detail}`
        : `An official township source lists this as a public service or infrastructure notice.`;
    case "planning_zoning":
      return detail
        ? `A posted township source references planning or zoning-related material: ${detail}`
        : `A posted township source references planning or zoning-related material.`;
    case "meeting_notice":
    case "unknown":
    default:
      return detail
        ? `According to the posted source, ${detail}`
        : `According to the posted source, this item appears in the latest municipal update list.`;
  }
}

function extractDetailSnippet(title: string, normalizedText: string) {
  const titleLower = compactText(title).toLowerCase();
  const withoutTitle = compactText(normalizedText)
    .replace(new RegExp(escapeRegExp(title), "ig"), "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = withoutTitle
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => compactText(sentence))
    .filter(
      (sentence) =>
        sentence.length > 30 && sentence.toLowerCase() !== titleLower
    );
  const snippet = selectDetailSentences(sentences).join(" ");

  if (!snippet) {
    return "";
  }

  return snippet.length > 240 ? `${snippet.slice(0, 237)}...` : snippet;
}

function selectDetailSentences(sentences: string[]) {
  const scored = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreDetailSentence(sentence)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 2)
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.sentence);

  if (scored.length > 0) {
    return scored;
  }

  return sentences.slice(0, 2);
}

function scoreDetailSentence(sentence: string) {
  const lower = sentence.toLowerCase();
  let score = 0;

  if (sentence.length >= 45 && sentence.length <= 420) {
    score += 1;
  }

  if (DETAIL_PRIORITY_PATTERNS.some((pattern) => lower.includes(pattern))) {
    score += 5;
  }

  if (
    /subdivision|land development|rezoning|variance|conditional use|ordinance|zoning|hearing|proposes|proposed|public comment|recommend approval|recommend tabling|table the plan|site is located/i.test(
      sentence
    )
  ) {
    score += 3;
  }

  if (
    /single family|open space lots|mixed-use|stormwater|township dedication|penndot permitting|lot add-on|conversion of [0-9]+ existing parcels|construction of/i.test(
      sentence
    )
  ) {
    score += 2;
  }

  if (
    /motion was made/i.test(sentence) &&
    !/recommend approval|recommend tabling|table the plan/i.test(sentence)
  ) {
    score -= 3;
  }

  if (DETAIL_LOW_SIGNAL_PATTERNS.some((pattern) => lower.includes(pattern))) {
    score -= 5;
  }

  return score;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatIsoDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function isOfficialSource(
  item: NormalizedSourceItem,
  options?: EvaluateItemOptions
): boolean {
  if (typeof options?.officialSource === "boolean") {
    return options.officialSource;
  }

  const candidateUrls = [item.sourcePageUrl, item.sourceUrl];

  return candidateUrls.some((candidateUrl) => {
    try {
      const hostname = new URL(candidateUrl).hostname.toLowerCase();

      return (
        hostname === "manheimtownship.org" ||
        hostname.endsWith(".manheimtownship.org") ||
        hostname.endsWith(".gov") ||
        hostname.endsWith(".us")
      );
    } catch {
      return false;
    }
  });
}

export function evaluateItem(
  item: NormalizedSourceItem,
  options?: EvaluateItemOptions
): ContentDecision {
  const classification = classifyItem(item);
  const impactLevel = inferImpactLevel(item, classification);
  const haystack = `${item.title} ${item.normalizedText}`.toLowerCase();
  const rationale: string[] = [];
  const officialSource = isOfficialSource(item, options);

  let riskLevel: ContentDecision["riskLevel"] = "low";
  let reviewState: ContentDecision["reviewState"] = "auto_published";
  let autoPublishAllowed = true;

  if (officialSource) {
    rationale.push("Official township or government source");
  } else {
    if (item.extraction.confidence < 0.75) {
      riskLevel = "review_required";
      reviewState = "review_required";
      autoPublishAllowed = false;
      rationale.push("Low extraction confidence");
    }

    if (classification === "planning_zoning") {
      riskLevel = "review_required";
      reviewState = "review_required";
      autoPublishAllowed = false;
      rationale.push("Planning or zoning content from an unofficial source");
    }

    if (HIGH_RISK_TERMS.some((term) => haystack.includes(term))) {
      riskLevel = "review_required";
      reviewState = "review_required";
      autoPublishAllowed = false;
      rationale.push(
        "Matched high-risk land use keywords on an unofficial source"
      );
    }
  }

  const summary = summarizeItem(item, classification);

  return contentDecisionSchema.parse({
    classification,
    impactLevel,
    riskLevel,
    reviewState,
    autoPublishAllowed,
    summary,
    extractionNote: item.extraction.note,
    rationale
  });
}

function collectMatches(
  text: string,
  pattern: RegExp,
  onMatch: (match: string) => void
) {
  for (const match of text.matchAll(pattern)) {
    if (match[0]) {
      onMatch(match[0]);
    }
  }
}

function addEntity(
  entities: ExtractedEntryEntity[],
  entityKind: ExtractedEntryEntity["entityKind"],
  label: string,
  confidence: number
) {
  const normalizedValue = compactText(label).toLowerCase();

  if (
    !normalizedValue ||
    entities.some((entity) => entity.normalizedValue === normalizedValue)
  ) {
    return;
  }

  entities.push({
    entityKind,
    label: compactText(label),
    normalizedValue,
    confidence
  });
}
