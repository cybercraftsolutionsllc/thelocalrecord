import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

export function parseFaqPage(html: string, sourcePageUrl: string): NormalizedSourceItem[] {
  const $ = load(html);
  const sourceSlug = resolveFaqSourceSlug(sourcePageUrl);

  return $("li[id^='question-'].faq-question-item")
    .toArray()
    .map((item, index) => {
      const questionId = $(item).attr("id") ?? `question-${index + 1}`;
      const question = compactText($(item).find(".accordion-button").first().text());
      const answerHtml = $(item).find(".accordion-text.fr-view").first().html() ?? "";
      const answerText = compactText($(item).find(".accordion-text.fr-view").first().text());
      const linkedResource = $(item).find(".accordion-body a[href]").first().attr("href");
      const linkedTitles = $(item)
        .find(".accordion-body a[href]")
        .toArray()
        .map((anchor) => compactText($(anchor).text()))
        .filter(Boolean)
        .join(" ");

      if (!question || !answerText) {
        return null;
      }

      const sourceUrl = linkedResource
        ? absoluteUrl(linkedResource, sourcePageUrl)
        : `${sourcePageUrl}#${questionId}`;

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug,
        externalId: `${sourcePageUrl}#${questionId}`,
        title: question,
        sourceUrl,
        sourcePageUrl,
        normalizedText: compactText(`${question} ${answerText} ${linkedTitles}`),
        extraction: {
          method: "html",
          confidence: 0.98,
          note: answerHtml.includes("froala.com")
            ? "FAQ answer text extracted from the township FAQ page."
            : undefined
        },
        metadata: {
          sourceSection: sourceSlug,
          anchorId: questionId
        },
        contentHash: hashContent(`${question}|${sourceUrl}|${answerText}`)
      });
    })
    .filter((value): value is NormalizedSourceItem => value !== null);
}

function resolveFaqSourceSlug(sourcePageUrl: string) {
  const lower = sourcePageUrl.toLowerCase();

  if (lower.includes("/1546/") || lower.includes("tid=42")) {
    return "planning-zoning-faq";
  }

  return "permit-faq";
}
