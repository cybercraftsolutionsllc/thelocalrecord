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

      if (!title) {
        return null;
      }

      const sourceUrl = href ? absoluteUrl(href, sourcePageUrl) : sourcePageUrl;
      const normalizedText = compactText($(alert).text());

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "alert-center",
        externalId: href ? sourceUrl : `${title}-${index}`,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText,
        extraction: {
          method: "html",
          confidence: 0.93
        },
        metadata: {},
        contentHash: hashContent(`${title}|${sourceUrl}|${normalizedText}`)
      });
    })
    .filter((value): value is NormalizedSourceItem => value !== null);
}
