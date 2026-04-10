import { load } from "cheerio";

import {
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

export function parsePlanningCommissionPage(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  return parseOverviewPage(html, sourcePageUrl, {
    sourceSlug: "planning-commission",
    sourceSection: "planning-commission"
  });
}

export function parsePlanningZoningFaqPage(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  return parseOverviewPage(html, sourcePageUrl, {
    sourceSlug: "planning-zoning-faq",
    sourceSection: "planning-zoning-faq"
  });
}

export function parseZoningHearingBoardPage(
  html: string,
  sourcePageUrl: string
): NormalizedSourceItem[] {
  return parseOverviewPage(html, sourcePageUrl, {
    sourceSlug: "zoning-hearing-board",
    sourceSection: "zoning-hearing-board"
  });
}

function parseOverviewPage(
  html: string,
  sourcePageUrl: string,
  args: {
    sourceSlug: string;
    sourceSection: string;
  }
): NormalizedSourceItem[] {
  const $ = load(html);
  const title = compactText($("h1, .pageTitle h1, .pageTitle, .subhead1").first().text());
  const detailText = extractBodyText($);

  if (!title || !detailText) {
    return [];
  }

  return [
    normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: args.sourceSlug,
      externalId: `${sourcePageUrl}#overview`,
      title,
      sourceUrl: sourcePageUrl,
      sourcePageUrl,
      normalizedText: compactText(`${title}. ${detailText}`),
      extraction: {
        method: "html",
        confidence: 0.97
      },
      metadata: {
        sourceSection: args.sourceSection
      },
      contentHash: hashContent(`${args.sourceSlug}|${sourcePageUrl}|${detailText}`)
    })
  ];
}

function extractBodyText($: ReturnType<typeof load>) {
  const candidates = [
    $("#contentarea .fr-view").first().text(),
    $("#contentarea .pageStyles").first().text(),
    $(".fr-view").first().text(),
    $(".pageStyles").first().text()
  ]
    .map((value) => compactText(value))
    .filter((value) => value.length > 80);

  const selected = candidates[0] ?? "";

  if (selected.length <= 2200) {
    return selected;
  }

  return `${selected.slice(0, 2197).trimEnd()}...`;
}
