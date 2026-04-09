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
      return `A posted township source references planning or zoning-related material for "${item.title}".`;
    case "meeting_notice":
    case "unknown":
    default:
      return text
        ? `According to the posted source, "${item.title}" appears in the latest update list. ${text.slice(0, 160)}${text.length > 160 ? "..." : ""}`
        : `According to the posted source, "${item.title}" appears in the latest municipal update list.`;
  }
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
