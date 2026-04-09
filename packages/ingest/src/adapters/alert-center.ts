import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

export function parseAlertCenter(html: string, sourcePageUrl: string): NormalizedSourceItem[] {
  const $ = load(html);
  const alerts = $(".alertItem, .alertsList li, [id*='alertsList'] li").toArray();

  if (alerts.length === 0) {
    return [];
  }

  return alerts
    .map((alert, index) => {
      const title = compactText($(alert).find("a, h3, h4").first().text() || $(alert).text());
      const href = $(alert).find("a").first().attr("href");
      const dateText = compactText($(alert).find(".date, .fst-italic, time").first().text());

      if (!title) {
        return null;
      }

      const sourceUrl = href ? absoluteUrl(href, sourcePageUrl) : sourcePageUrl;
      const normalizedText = compactText($(alert).text());
      const publishedAt = parseDateText(dateText);

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "alert-center",
        externalId: href ? sourceUrl : `${title}-${index}`,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText,
        publishedAt,
        extraction: {
          method: "html",
          confidence: 0.93
        },
        metadata: dateText ? { listedDate: dateText } : {},
        contentHash: hashContent(`${title}|${sourceUrl}|${dateText}|${normalizedText}`)
      });
    })
    .filter((value): value is NormalizedSourceItem => value !== null);
}

export function extractAlertDetail(html: string) {
  const $ = load(html);
  const detailText = compactText(
    $(".article-content, .fr-view, .alert-content, .content").first().text()
  );
  const publishedText = compactText(
    $("#article-header-date, .article-header-date, .article-date, .fst-italic, time").first().text()
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
