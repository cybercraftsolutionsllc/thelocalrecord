import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

type ArchivePageOptions = {
  sourceSlug: string;
  maxItems?: number;
  categoryHint?: string;
};

export function parseArchivePage(
  html: string,
  sourcePageUrl: string,
  options: ArchivePageOptions
): NormalizedSourceItem[] {
  const $ = load(html);
  const collectionTitle = compactText(
    $(".archive").first().text() ||
      $("title").first().text().replace(/^Archive Center\s*•\s*/i, "")
  );
  const rows = $("table[summary='Archive Details']")
    .toArray()
    .map((table) => {
      const anchor = $(table).find("a[href]").first();
      const href = anchor.attr("href");
      const title = compactText(anchor.text());
      const description = compactText($(table).find("span[style*='italic']").first().text());

      if (!href || !title) {
        return null;
      }

      const sourceUrl = absoluteUrl(href, sourcePageUrl);
      const eventDate = parseArchiveDate(title) ?? parseArchiveDate(description);

      return normalizedSourceItemSchema.parse({
        municipalitySlug: "manheimtownshippa",
        sourceSlug: options.sourceSlug,
        externalId: sourceUrl,
        title,
        sourceUrl,
        sourcePageUrl,
        normalizedText: compactText(
          [title, description, collectionTitle].filter(Boolean).join(". ")
        ),
        publishedAt: eventDate,
        eventDate,
        categoryHint: options.categoryHint,
        extraction: {
          method: "html",
          confidence: 0.95,
          note: "Listed on the township archive page; linked document text is enriched during ingest."
        },
        metadata: {
          archiveCollection: collectionTitle,
          ...(description ? { archiveDescription: description } : {})
        },
        artifactUrl: sourceUrl,
        contentHash: hashContent(`${options.sourceSlug}|${sourceUrl}|${title}|${description}`)
      });
    })
    .filter((value): value is NormalizedSourceItem => value !== null);

  return rows.slice(0, options.maxItems ?? rows.length);
}

function parseArchiveDate(value: string) {
  if (!value) {
    return undefined;
  }

  const normalized = compactText(value)
    .replace(/–/g, "-")
    .replace(/\b(agenda|minutes|meeting|special|staff briefing|planning commission|commissioners|board of commissioners|zoning hearing board|cac|board)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parsed = Date.parse(normalized);

  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  const patterns = [
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/,
    /\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/,
    /\b[A-Za-z]+\s+\d{1,2},\s+\d{4}\b/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (!match) {
      continue;
    }

    const fallbackParsed = Date.parse(match[0]);

    if (!Number.isNaN(fallbackParsed)) {
      return new Date(fallbackParsed).toISOString();
    }
  }

  return undefined;
}

export function parsePlanningCommissionAgendasArchive(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  return parseArchivePage(html, sourcePageUrl, {
    sourceSlug: "planning-commission-agendas",
    maxItems: 8
  });
}

export function parsePlanningCommissionMinutesArchive(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  return parseArchivePage(html, sourcePageUrl, {
    sourceSlug: "planning-commission-minutes",
    maxItems: 12,
    categoryHint: "housing_and_growth"
  });
}
