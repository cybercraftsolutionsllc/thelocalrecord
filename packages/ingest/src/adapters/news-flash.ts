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
      const dateText = compactText(
        container.find(".fst-italic, .article-date, .article-header-date").first().text()
      );

      if (!title || !href) {
        return null;
      }

      const sourceUrl = absoluteUrl(href, sourcePageUrl);
      const normalizedText = compactText([title, preview].filter(Boolean).join(" "));
      const publishedAt = parseDateText(dateText);

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "township-news",
        externalId: sourceUrl,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText,
        publishedAt,
        extraction: {
          method: "html",
          confidence: 0.95
        },
        metadata: dateText ? { listedDate: dateText } : {},
        contentHash: hashContent(`${title}|${sourceUrl}|${dateText}|${normalizedText}`)
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

export function extractNewsFlashDetail(html: string) {
  const $ = load(html);
  const detailText = compactText(
    $(".article-content, .fr-view, .newsFlashContent, .article-body").first().text()
  );
  const publishedText = compactText(
    $("#article-header-date, .article-header-date, .article-date, .fst-italic").first().text()
  );
  const publishedAt = parseDateText(publishedText);

  return {
    detailText,
    publishedAt,
    publishedText,
    attachments: [] as string[]
  };
}

function parseDateText(value: string) {
  if (!value) {
    return undefined;
  }

  const cleaned = compactText(
    value
      .replace(/^published[:\s-]*/i, "")
      .replace(/^posted[:\s-]*/i, "")
  );
  const parsed = Date.parse(cleaned);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}
