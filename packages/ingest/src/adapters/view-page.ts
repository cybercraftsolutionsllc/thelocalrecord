import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

const EXACT_ALLOWED_TITLES = new Set([
  "Building and Code Enforcement Ordinances",
  "The Comprehensive Plan",
  "Disorderly Conduct (Noise) Ordinance"
]);

const SKIP_PATTERNS = [
  "agenda and minutes",
  "announcements and news events",
  "calendar",
  "employee",
  "hr",
  "benefit",
  "payroll",
  "forms",
  "intranet",
  "contact hr",
  "email",
  "directory"
];

export function parseViewPage(html: string, sourcePageUrl: string): NormalizedSourceItem[] {
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

  return [...uniqueLinks.values()].map((link) =>
    normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "view-page",
      externalId: link.sourceUrl,
      title: link.title,
      sourceUrl: link.sourceUrl,
      sourcePageUrl,
      normalizedText: compactText(
        `${link.title}. Linked from the township public information page as a resident-facing resource.`
      ),
      extraction: {
        method: "html",
        confidence: 0.92
      },
      metadata: {
        sourceSection: "view-page"
      },
      contentHash: hashContent(`${link.title}|${link.sourceUrl}|view-page`)
    })
  );
}

function shouldInclude(title: string, sourceUrl: string) {
  const lower = title.toLowerCase();

  if (
    sourceUrl.startsWith("mailto:") ||
    sourceUrl.startsWith("tel:") ||
    sourceUrl.includes("/MyAccount") ||
    sourceUrl.includes("/directory") ||
    sourceUrl.includes("/QuickLinks") ||
    sourceUrl.includes("/DocumentCenter/Index/")
  ) {
    return false;
  }

  if (SKIP_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return false;
  }

  return EXACT_ALLOWED_TITLES.has(title);
}
