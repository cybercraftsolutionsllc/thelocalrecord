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

export function classifyItem(item: NormalizedSourceItem): ContentDecision["classification"] {
  const haystack = `${item.title} ${item.normalizedText}`.toLowerCase();

  if (item.sourceSlug === "alert-center") {
    return "official_alert";
  }

  if (item.sourceSlug === "township-news") {
    return "official_news";
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

  switch (classification) {
    case "agenda_posted":
      return `According to the posted agenda listing, "${item.title}" is available from the township agenda portal.`;
    case "approved_minutes":
      return `According to the posted minutes listing, "${item.title}" is available through the township agenda portal.`;
    case "official_alert":
      return `The township alert center lists "${item.title}" as an active public alert${item.eventDate ? " with a listed event date." : "."}`;
    case "official_news":
      return `The township news feed lists "${item.title}" as an official news post.`;
    case "calendar_update":
      return `The township calendar materials list "${item.title}" as a public event or meeting update.`;
    case "service_notice":
      return `An official township source lists "${item.title}" as a public service or infrastructure notice.`;
    case "planning_zoning":
      return `A posted township source references planning or zoning-related material for "${item.title}". Review is required before publication.`;
    case "meeting_notice":
    case "unknown":
    default:
      return text
        ? `According to the posted source, "${item.title}" appears in the latest municipal update list. ${text.slice(0, 180)}${text.length > 180 ? "..." : ""}`
        : `According to the posted source, "${item.title}" appears in the latest municipal update list.`;
  }
}

export function evaluateItem(item: NormalizedSourceItem): ContentDecision {
  const classification = classifyItem(item);
  const haystack = `${item.title} ${item.normalizedText}`.toLowerCase();
  const rationale: string[] = [];

  let riskLevel: ContentDecision["riskLevel"] = "low";
  let reviewState: ContentDecision["reviewState"] = "auto_published";
  let autoPublishAllowed = true;

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
    rationale.push("Planning or zoning content needs manual review");
  }

  if (HIGH_RISK_TERMS.some((term) => haystack.includes(term))) {
    riskLevel = "review_required";
    reviewState = "review_required";
    autoPublishAllowed = false;
    rationale.push("Matched high-risk land use keywords");
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
