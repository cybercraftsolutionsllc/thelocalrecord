import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

const CALENDAR_EVENT_SELECTOR = "a[href*='Calendar.aspx?EID=']";

export function parseCalendarPage(html: string, sourcePageUrl: string): NormalizedSourceItem[] {
  const $ = load(html);

  return dedupeByExternalId(
    $(CALENDAR_EVENT_SELECTOR)
      .toArray()
      .map((anchor) => {
        const href = $(anchor).attr("href");

        if (!href) {
          return null;
        }

        const container = $(anchor).closest(".monthItem, .listItem, .detailsTooltip, li, tr, td, div");
        const title = compactText(
          container.find("h3.dim, h3, h4").first().text() ||
            container.find(".tooltipInner h3, .detailsTooltip h3").first().text() ||
            container.text()
        )
          .replace(/\s*Category:.*$/i, "")
          .replace(/\s*When:.*$/i, "")
          .trim();

        if (!title || /^more details$/i.test(title)) {
          return null;
        }

        const sourceUrl = absoluteUrl(href, sourcePageUrl);
        const detailText = compactText(
          container.find(".detailsTooltip, .tooltipInner").first().text() || container.text()
        );
        const locationText = compactText(container.find(".eventLocation").first().text()).replace(/^@\s*/, "");
        const listedDateText = extractListedDate(detailText, sourceUrl);
        const eventDate = listedDateText ? parseDateText(listedDateText) : parseDateFromUrl(sourceUrl);
        const normalizedText = compactText(
          [
            title,
            detailText,
            locationText ? `Location: ${locationText}` : "",
            eventDate ? `Event date: ${eventDate}` : ""
          ]
            .filter(Boolean)
            .join(" ")
        );
        const metadata: Record<string, string> = {};

        if (listedDateText) {
          metadata.listedDate = listedDateText;
        }

        if (locationText) {
          metadata.location = locationText;
        }

        return normalizedSourceItemSchema.parse({
          municipalitySlug: "manheimtownshippa",
          sourceSlug: "calendar",
          externalId: sourceUrl,
          title,
          sourceUrl,
          sourcePageUrl,
          normalizedText,
          publishedAt: eventDate,
          eventDate,
          extraction: {
            method: "html",
            confidence: 0.95
          },
          metadata,
          contentHash: hashContent(`${title}|${sourceUrl}|${listedDateText}|${locationText}|${normalizedText}`)
        });
      })
      .filter((value): value is NormalizedSourceItem => value !== null)
  );
}

export function extractCalendarDetail(html: string) {
  const $ = load(html);
  const meaningfulLinks = $("a[href]")
    .map((_, anchor) => {
      const href = $(anchor).attr("href") ?? "";
      const label = compactText($(anchor).text());

      if (!href || !label) {
        return null;
      }

      if (
        href.startsWith("#") ||
        label === "More Details" ||
        label === "Google" ||
        label === "Bing" ||
        label === "Print" ||
        label === "Notify Me" ||
        label === "Subscribe to iCalendar" ||
        /^return to previous$/i.test(label)
      ) {
        return null;
      }

      if (
        label.includes("Facebook") ||
        label.includes("Twitter") ||
        label.includes("Instagram") ||
        label.includes("YouTube") ||
        label.includes("Threads")
      ) {
        return null;
      }

      return label;
    })
    .get()
    .filter((value): value is string => Boolean(value));

  return {
    detailText: compactText(meaningfulLinks.join(" ")),
    attachments: [...new Set(meaningfulLinks)],
    publishedAt: undefined,
    publishedText: undefined
  };
}

function dedupeByExternalId(items: NormalizedSourceItem[]) {
  const unique = new Map<string, NormalizedSourceItem>();

  for (const item of items) {
    unique.set(item.externalId, item);
  }

  return [...unique.values()];
}

function extractListedDate(value: string, sourceUrl: string) {
  const detailedMatch = value.match(
    /\b([A-Z][a-z]+ \d{1,2}, \d{4}(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))?)?)/
  );

  if (detailedMatch?.[1]) {
    return detailedMatch[1];
  }

  const dateInTitle = value.match(/\b(\d{1,2} [A-Z][a-z]+ \d{4})\b/);

  if (dateInTitle?.[1]) {
    return dateInTitle[1];
  }

  return extractDateFromUrlParts(sourceUrl);
}

function extractDateFromUrlParts(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const month = url.searchParams.get("month");
    const day = url.searchParams.get("day");
    const year = url.searchParams.get("year");

    if (!month || !day || !year) {
      return "";
    }

    const parsed = new Date(Number(year), Number(month) - 1, Number(day));

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

function parseDateFromUrl(sourceUrl: string) {
  const text = extractDateFromUrlParts(sourceUrl);
  return text ? parseDateText(text) : undefined;
}

function parseDateText(value: string) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}
