import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

const INCLUDE_PATTERNS = [
  "codified ordinances",
  "planning commission deadline",
  "zoning hearing board deadline",
  "planning and zoning fees",
  "open records request resources",
  "comprehensive plan",
  "stormwater",
  "subdivision",
  "land development",
  "permit",
  "map library",
  "zoning",
  "fee schedule"
];

const EXCLUDE_PATTERNS = [
  "contact us",
  "email",
  "contact",
  "faq",
  "view all",
  "home",
  "site map",
  "accessibility",
  "copyright",
  "quick links",
  "facebook",
  "twitter",
  "instagram",
  "youtube",
  "threads"
];

export function parsePlanningZoningPage(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  const $ = load(html);
  const links = $("a[href]")
    .map((_, anchor) => {
      const href = $(anchor).attr("href");
      const title = compactText($(anchor).text());

      if (!href || !title) {
        return null;
      }

      return {
        title,
        sourceUrl: absoluteUrl(href, sourcePageUrl)
      };
    })
    .get()
    .filter((value): value is { title: string; sourceUrl: string } => value !== null)
    .filter((link) => shouldInclude(link.title, link.sourceUrl));

  const uniqueLinks = new Map<string, { title: string; sourceUrl: string }>();

  for (const link of links) {
    uniqueLinks.set(link.sourceUrl, link);
  }

  return [...uniqueLinks.values()].slice(0, 12).map((link) =>
    normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-zoning",
      externalId: link.sourceUrl,
      title: link.title,
      sourceUrl: link.sourceUrl,
      sourcePageUrl,
      normalizedText: compactText(
        `${link.title}. Listed on the township Planning and Zoning Department page as a public planning, zoning, ordinance, permit, map, or development resource.`
      ),
      extraction: {
        method: "html",
        confidence: 0.94
      },
      metadata: {
        sourceSection: "planning-zoning"
      },
      contentHash: hashContent(`${link.title}|${link.sourceUrl}|planning-zoning`)
    })
  );
}

function shouldInclude(title: string, sourceUrl: string) {
  const lower = title.toLowerCase();
  const urlLower = sourceUrl.toLowerCase();

  if (
    sourceUrl.includes("#") ||
    sourceUrl.startsWith("mailto:") ||
    sourceUrl.startsWith("tel:") ||
    urlLower.includes("/quicklinks") ||
    urlLower.includes("/directory") ||
    urlLower.includes("/faq") ||
    urlLower.endsWith("/478/planning-zoning")
  ) {
    return false;
  }

  if (EXCLUDE_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return false;
  }

  if (/^skip to main content$/i.test(title)) {
    return false;
  }

  return INCLUDE_PATTERNS.some(
    (pattern) => lower.includes(pattern) || urlLower.includes(pattern.replace(/\s+/g, "-"))
  );
}
