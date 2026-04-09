import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

export function parseAgendaCenter(html: string, sourcePageUrl: string): NormalizedSourceItem[] {
  const $ = load(html);
  const rows = $("tr[id^='row']").toArray();

  return rows
    .map((row, index) => {
      const cells = $(row).find("td");
      const title = compactText(
        $(cells[0]).text() || $(row).find("a").first().text() || `Agenda item ${index + 1}`
      );
      const dateText = compactText($(cells[1]).text());
      const agendaLink = $(row)
        .find("a")
        .toArray()
        .map((anchor) => $(anchor).attr("href"))
        .find(Boolean);

      if (!title || !agendaLink) {
        return null;
      }

      const metadata: Record<string, string> = {};

      if (dateText) {
        metadata.listedDate = dateText;
      }

      const normalizedText = compactText(
        [title, $(row).text(), agendaLink].filter(Boolean).join(" ")
      );
      const sourceUrl = absoluteUrl(agendaLink, sourcePageUrl);
      const isPdf = sourceUrl.toLowerCase().endsWith(".pdf");

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: "agenda-center",
        externalId: `${title}-${dateText || sourceUrl}`,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText,
        extraction: {
          method: isPdf ? "pdf" : "html",
          confidence: isPdf ? 0.72 : 0.95,
          note: isPdf
            ? "Attachment detected. Linked artifact stored; PDF extraction is conservative in v1."
            : undefined
        },
        metadata,
        artifactUrl: sourceUrl,
        contentHash: hashContent(`${title}|${dateText}|${sourceUrl}|${normalizedText}`)
      });
    })
    .filter((value): value is NormalizedSourceItem => value !== null);
}
