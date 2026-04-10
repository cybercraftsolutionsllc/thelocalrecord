import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

const INCLUDE_PATTERNS = [
  "permit",
  "code",
  "ordinance",
  "occupancy",
  "stormwater",
  "rental housing",
  "complaints",
  "building permit",
  "fee",
  "fireworks",
  "blasting",
  "roofing",
  "solar",
  "generator",
  "demolition",
  "deck",
  "faq"
];

const EXCLUDE_PATTERNS = [
  "skip to main content",
  "click here",
  "email code compliance",
  "view all",
  "site map",
  "contact us",
  "accessibility",
  "copyright",
  "home",
  "social media",
  "employee intranet"
];

export function parseCodeCompliancePage(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  const $ = load(html);
  const items = new Map<string, NormalizedSourceItem>();

  for (const update of collectInlineUpdates($, sourcePageUrl)) {
    items.set(update.externalId, update);
  }

  for (const link of collectRelevantLinks($, sourcePageUrl)) {
    items.set(
      link.sourceUrl,
      normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "code-compliance",
        externalId: link.sourceUrl,
        title: link.title,
        sourceUrl: link.sourceUrl,
        sourcePageUrl,
        normalizedText: compactText(
          `${link.title}. Listed on the township Code Compliance page as an official permit, code, fee, complaint, occupancy, or inspection resource.`
        ),
        extraction: {
          method: isPdfLink(link.sourceUrl) ? "pdf" : "html",
          confidence: isPdfLink(link.sourceUrl) ? 0.76 : 0.93,
          note: isPdfLink(link.sourceUrl)
            ? "Linked document stored from the township code compliance page."
            : undefined
        },
        metadata: {
          sourceSection: "code-compliance"
        },
        contentHash: hashContent(`${link.title}|${link.sourceUrl}|code-compliance`)
      })
    );
  }

  return [...items.values()];
}

function collectInlineUpdates($: ReturnType<typeof load>, sourcePageUrl: string) {
  const updates: NormalizedSourceItem[] = [];
  const paragraphs = $(".fr-view p").toArray();

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    const text = compactText($(paragraph).text());

    if (!/update[:\s]/i.test(text)) {
      continue;
    }

    const link = $(paragraph).find("a[href]").first();
    const href = link.attr("href");
    const linkedTitle = compactText(link.text());
    const sourceUrl = href ? absoluteUrl(href, sourcePageUrl) : `${sourcePageUrl}#update-${index + 1}`;
    const title = linkedTitle || text.split(":").slice(1).join(":").trim() || `Code compliance update ${index + 1}`;
    const nextText = compactText($(paragraphs[index + 1]).text());
    const normalizedText = compactText([text, nextText].filter(Boolean).join(" "));

    updates.push(
      normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "code-compliance",
        externalId: `${sourceUrl}|update`,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText,
        extraction: {
          method: href && isPdfLink(sourceUrl) ? "pdf" : "html",
          confidence: href && isPdfLink(sourceUrl) ? 0.8 : 0.95
        },
        metadata: {
          sourceSection: "code-compliance-inline-update"
        },
        contentHash: hashContent(`${title}|${sourceUrl}|${normalizedText}`)
      })
    );
  }

  return updates;
}

function collectRelevantLinks($: ReturnType<typeof load>, sourcePageUrl: string) {
  return $("a[href]")
    .toArray()
    .map((anchor) => {
      const href = $(anchor).attr("href");
      const title = compactText($(anchor).text());

      if (!href || !title) {
        return null;
      }

      return {
        title: cleanTitle(title),
        sourceUrl: absoluteUrl(href, sourcePageUrl)
      };
    })
    .filter((value): value is { title: string; sourceUrl: string } => value !== null)
    .filter((link) => shouldInclude(link.title, link.sourceUrl))
    .filter((link, index, collection) => {
      return collection.findIndex((candidate) => candidate.sourceUrl === link.sourceUrl) === index;
    });
}

function shouldInclude(title: string, sourceUrl: string) {
  const lower = title.toLowerCase();
  const urlLower = sourceUrl.toLowerCase();

  if (
    sourceUrl.includes("#") ||
    sourceUrl.startsWith("mailto:") ||
    sourceUrl.startsWith("tel:") ||
    urlLower.includes("/faq.aspx") ||
    urlLower.includes("/directory") ||
    urlLower.includes("/quicklinks") ||
    urlLower.endsWith("/865/code-compliance")
  ) {
    return false;
  }

  if (EXCLUDE_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return false;
  }

  return INCLUDE_PATTERNS.some((pattern) => lower.includes(pattern) || urlLower.includes(pattern));
}

function cleanTitle(title: string) {
  return compactText(title.replace(/\bversion options.*$/i, ""));
}

function isPdfLink(url: string) {
  const lower = url.toLowerCase();
  return lower.endsWith(".pdf") || lower.includes("/documentcenter/view/");
}
