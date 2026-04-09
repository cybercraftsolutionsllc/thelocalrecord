import { load } from "cheerio";

import {
  absoluteUrl,
  compactText,
  hashContent,
  normalizedSourceItemSchema,
  type NormalizedSourceItem
} from "@thelocalrecord/core";

type FetchLike = typeof fetch;

const LOOKBACK_MS = 1000 * 60 * 60 * 24 * 30;
const LOOKAHEAD_MS = 1000 * 60 * 60 * 24 * 120;

export async function parseIcalendarDirectory(
  html: string,
  sourcePageUrl: string,
  fetcher: FetchLike,
  userAgent?: string
): Promise<NormalizedSourceItem[]> {
  const $ = load(html);
  const feedLinks = $("a[href*='common/modules/iCalendar/iCalendar.aspx?catID=']")
    .map((_, anchor) => {
      const href = $(anchor).attr("href");
      const title = compactText($(anchor).text());

      if (!href || !title) {
        return null;
      }

      return {
        title,
        url: absoluteUrl(href, sourcePageUrl)
      };
    })
    .get()
    .filter((value): value is { title: string; url: string } => value !== null)
    .filter((feed) => !/^main township calendar$/i.test(feed.title));

  const uniqueFeeds = new Map<string, { title: string; url: string }>();

  for (const feed of feedLinks) {
    uniqueFeeds.set(feed.url, feed);
  }

  const responses = await Promise.all(
    [...uniqueFeeds.values()].map(async (feed) => {
      const response = await fetcher(feed.url, {
        headers: userAgent ? { "user-agent": userAgent } : undefined
      });

      if (!response.ok) {
        return [] as NormalizedSourceItem[];
      }

      const body = await response.text();
      return parseIcalendarFeed(body, feed.title, feed.url);
    })
  );

  return dedupeByExternalId(responses.flat());
}

function parseIcalendarFeed(body: string, feedTitle: string, feedUrl: string): NormalizedSourceItem[] {
  return unfoldIcalendar(body)
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((chunk) => chunk.split("END:VEVENT")[0] ?? "")
    .map((chunk) => parseEventBlock(chunk))
    .filter((event): event is Record<string, string> => Boolean(event))
    .map((event) => toNormalizedEvent(event, feedTitle, feedUrl))
    .filter((event): event is NormalizedSourceItem => Boolean(event));
}

function toNormalizedEvent(event: Record<string, string>, feedTitle: string, feedUrl: string) {
  const title = compactText(unescapeIcalendarValue(event.SUMMARY ?? ""));
  const uid = compactText(event.UID ?? "");
  const description = compactText(unescapeIcalendarValue(event.DESCRIPTION ?? ""));
  const location = compactText(unescapeIcalendarValue(stripHtml(event.LOCATION ?? "")));
  const eventDate = parseIcalendarDate(event.DTSTART ?? "");
  const publishedAt = parseIcalendarDate(event.LAST_MODIFIED ?? "") ?? eventDate;

  if (!title || !uid || !eventDate) {
    return null;
  }

  const now = Date.now();
  const eventTime = Date.parse(eventDate);

  if (Number.isNaN(eventTime) || eventTime < now - LOOKBACK_MS || eventTime > now + LOOKAHEAD_MS) {
    return null;
  }

  const sourceUrl = extractEventUrl(description) || extractEventUrl(event.URL ?? "") || feedUrl;
  const normalizedText = compactText(
    [
      title,
      `${feedTitle} iCalendar event`,
      location ? `Location: ${location}` : "",
      description ? `Details: ${description}` : "",
      `Event date: ${eventDate}`
    ]
      .filter(Boolean)
      .join(" ")
  );

  return normalizedSourceItemSchema.parse({
    municipalitySlug: "manheimtownshippa",
    sourceSlug: "icalendar",
    externalId: `${feedTitle}-${uid}`,
    title,
    sourceUrl,
    sourcePageUrl: feedUrl,
    normalizedText,
    publishedAt,
    eventDate,
    extraction: {
      method: "ical",
      confidence: 0.96
    },
    metadata: {
      feedTitle,
      ...(location ? { location } : {})
    },
    contentHash: hashContent(`${feedTitle}|${uid}|${sourceUrl}|${eventDate}|${normalizedText}`)
  });
}

function unfoldIcalendar(body: string) {
  return body.replace(/\r?\n[ \t]/g, "");
}

function parseEventBlock(chunk: string) {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const event: Record<string, string> = {};

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const rawKey = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    const key = rawKey.split(";")[0] ?? rawKey;

    event[key] = value;
  }

  return event;
}

function parseIcalendarDate(value: string) {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/Z$/, "");

  if (/^\d{8}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    return new Date(year, month, day).toISOString();
  }

  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    const hour = Number(cleaned.slice(9, 11));
    const minute = Number(cleaned.slice(11, 13));
    const second = Number(cleaned.slice(13, 15));
    return new Date(year, month, day, hour, minute, second).toISOString();
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}

function extractEventUrl(value: string) {
  const match = value.match(/https?:\/\/\S+/i);

  return match?.[0]?.trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function unescapeIcalendarValue(value: string) {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function dedupeByExternalId(items: NormalizedSourceItem[]) {
  const unique = new Map<string, NormalizedSourceItem>();

  for (const item of items) {
    unique.set(item.externalId, item);
  }

  return [...unique.values()];
}
