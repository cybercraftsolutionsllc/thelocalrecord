import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

const INCLUDE_PATTERNS = [
  "comprehensive plan",
  "adopted plan",
  "implementation dashboard",
  "future character area map",
  "key elements",
  "advisory committee",
  "what is a comprehensive plan",
  "implementation committee",
  "plan document"
];

const EXCLUDE_PATTERNS = [
  "home",
  "site map",
  "accessibility",
  "copyright",
  "schedule of fees"
];

export function parseComprehensivePlanPage(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  const $ = load(html);
  const items = new Map<string, NormalizedSourceItem>();

  for (const link of $("a[href]")
    .toArray()
    .map((anchor) => {
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
    .filter((value): value is { title: string; sourceUrl: string } => value !== null)
    .filter((link) => shouldInclude(link.title, link.sourceUrl))) {
    items.set(
      link.sourceUrl,
      normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "comprehensive-plan",
        externalId: link.sourceUrl,
        title: link.title,
        sourceUrl: link.sourceUrl,
        sourcePageUrl,
        normalizedText: compactText(
          `${link.title}. Listed on the township comprehensive plan homepage as an official plan, map, dashboard, or implementation resource.`
        ),
        extraction: {
          method: isPdfLink(link.sourceUrl) ? "pdf" : "html",
          confidence: isPdfLink(link.sourceUrl) ? 0.8 : 0.94,
          note: isPdfLink(link.sourceUrl)
            ? "Linked plan document stored from the township comprehensive plan page."
            : undefined
        },
        metadata: {
          sourceSection: "comprehensive-plan"
        },
        contentHash: hashContent(`${link.title}|${link.sourceUrl}|comprehensive-plan`)
      })
    );
  }

  return [...items.values()];
}

function shouldInclude(title: string, sourceUrl: string) {
  const lower = title.toLowerCase();
  const urlLower = sourceUrl.toLowerCase();

  if (
    sourceUrl.startsWith("mailto:") ||
    sourceUrl.startsWith("tel:") ||
    urlLower.endsWith("/64/comprehensive-plan-homepage")
  ) {
    return false;
  }

  if (EXCLUDE_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return false;
  }

  return INCLUDE_PATTERNS.some((pattern) => lower.includes(pattern) || urlLower.includes(pattern));
}

function isPdfLink(url: string) {
  const lower = url.toLowerCase();
  return lower.endsWith(".pdf") || lower.includes("/documentcenter/view/");
}
