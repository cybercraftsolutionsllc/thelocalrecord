import type { ContentDecision, NormalizedSourceItem } from "@thelocalrecord/core";

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

type EvaluateItemOptions = {
  officialSource?: boolean;
};

export function classifyItem(item: NormalizedSourceItem): ContentDecision["classification"] {
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

  if (item.sourceSlug === "code-compliance" || item.sourceSlug === "permit-faq") {
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

  if (/permit|code compliance|building code|certificate of use|occupancy|inspection|stormwater management plan|faq|ucc|icc/i.test(haystack)) {
    return "service_notice";
  }

  if (HIGH_RISK_TERMS.some((term) => haystack.includes(term))) {
    return "planning_zoning";
  }

  return "meeting_notice";
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
    .filter((sentence) => sentence.length > 30 && sentence.toLowerCase() !== titleLower);

  const snippet = sentences.slice(0, 2).join(" ");

  if (!snippet) {
    return "";
  }

  return snippet.length > 240 ? `${snippet.slice(0, 237)}...` : snippet;
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

function isOfficialSource(item: NormalizedSourceItem, options?: EvaluateItemOptions): boolean {
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

export function evaluateItem(item: NormalizedSourceItem, options?: EvaluateItemOptions): ContentDecision {
  const classification = classifyItem(item);
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
      rationale.push("Matched high-risk land use keywords on an unofficial source");
    }
  }

  const summary = summarizeItem(item, classification);

  return contentDecisionSchema.parse({
    classification,
    riskLevel,
    reviewState,
    autoPublishAllowed,
    summary,
    extractionNote: item.extraction.note,
    rationale
  });
}
