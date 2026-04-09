import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

export function parseNewsFlash(html: string, sourcePageUrl: string): NormalizedSourceItem[] {
  const $ = load(html);
  const items = $("a.article-title-link")
    .toArray()
    .map((anchor) => {
      const title = compactText($(anchor).text());
      const href = $(anchor).attr("href");
      const container = $(anchor).closest("[id^='article-'], li, .carousel-item, .article-link");
      const preview = compactText(
        container.find(".article-preview, .article-truncate-3, .article-truncate-5").text()
      );

      if (!title || !href) {
        return null;
      }

      const sourceUrl = absoluteUrl(href, sourcePageUrl);
      const normalizedText = compactText([title, preview].filter(Boolean).join(" "));

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "township-news",
        externalId: sourceUrl,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText,
        extraction: {
          method: "html",
          confidence: 0.95
        },
        metadata: {},
        contentHash: hashContent(`${title}|${sourceUrl}|${normalizedText}`)
      });
    })
    .filter((value): value is NormalizedSourceItem => value !== null);

  return dedupeByExternalId(items);
}

function dedupeByExternalId(items: NormalizedSourceItem[]) {
  const unique = new Map<string, NormalizedSourceItem>();

  for (const item of items) {
    unique.set(item.externalId, item);
  }

  return [...unique.values()];
}
