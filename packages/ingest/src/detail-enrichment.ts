import { Buffer } from "node:buffer";
import pdfParse from "pdf-parse";

import { compactText, hashContent, type NormalizedSourceItem } from "@thelocalrecord/core";

import { extractAlertDetail } from "./adapters/alert-center";
import { extractNewsFlashDetail } from "./adapters/news-flash";
import { extractPageDetail } from "./adapters/page-detail";

type EnrichOptions = {
  fetchImpl?: typeof fetch;
  userAgent?: string;
};

const HTML_DETAIL_SOURCE_SLUGS = new Set([
  "township-news",
  "code-news",
  "alert-center",
  "view-page",
  "planning-zoning",
  "code-compliance",
  "comprehensive-plan"
]);

const PDF_DETAIL_SOURCE_SLUGS = new Set([
  "planning-commission-agendas",
  "planning-commission-minutes"
]);

const PDF_HIGHLIGHT_TERMS = [
  "ashford meadows",
  "housing",
  "residential",
  "dwelling",
  "apartment",
  "townhome",
  "subdivision",
  "land development",
  "development plan",
  "preliminary/final",
  "preliminary",
  "final",
  "waiver",
  "modification",
  "extension",
  "stormwater",
  "rezoning",
  "variance",
  "conditional use",
  "hearing",
  "public comment",
  "motion was made",
  "recommend approval",
  "recommendation",
  "board of commissioners"
];

const PDF_LOW_SIGNAL_TERMS = [
  "roll call",
  "call to order",
  "pledge of allegiance",
  "approval of the minutes",
  "adjournment",
  "attendance",
  "meeting to order"
];

export async function enrichSourceItemsWithFetchedDetails(
  items: NormalizedSourceItem[],
  sourceSlug: string,
  options: EnrichOptions = {}
) {
  if (!HTML_DETAIL_SOURCE_SLUGS.has(sourceSlug) && !PDF_DETAIL_SOURCE_SLUGS.has(sourceSlug)) {
    return items;
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  return Promise.all(
    items.map(async (item) => {
      if (!shouldFetchItemDetail(sourceSlug, item.sourceUrl, item.sourcePageUrl)) {
        return item;
      }

      try {
        const response = await fetchImpl(item.sourceUrl, {
          headers: {
            "user-agent":
              options.userAgent ?? "thelocalrecord-bot/0.1 (+https://thelocalrecord.org)"
          }
        });

        if (!response.ok) {
          return item;
        }

        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

        if (isPdfResponse(contentType, response.url, item.sourceUrl)) {
          const bytes = await response.arrayBuffer();
          const pdfDetail = await extractPdfDocumentDetail(bytes);

          if (!pdfDetail.fullText) {
            return item;
          }

          const normalizedText = compactText(
            [
              item.title,
              item.metadata.archiveDescription,
              pdfDetail.highlightText,
              pdfDetail.fullText
            ]
              .filter(Boolean)
              .join(" ")
          );

          return {
            ...item,
            normalizedText,
            extraction: {
              method: "pdf",
              confidence: pdfDetail.confidence,
              note:
                "Text extracted from the posted PDF document. Formatting may be imperfect, so check the original file for exact wording."
            },
            metadata: {
              ...item.metadata,
              pdfPageCount: String(pdfDetail.pageCount)
            },
            contentHash: hashContent(
              `pdf-detail-v1|${item.title}|${item.sourceUrl}|${item.publishedAt ?? ""}|${normalizedText}`
            )
          } satisfies NormalizedSourceItem;
        }

        const html = await response.text();
        const detail =
          sourceSlug === "township-news" || sourceSlug === "code-news"
            ? extractNewsFlashDetail(html)
            : sourceSlug === "alert-center"
              ? extractAlertDetail(html)
              : extractPageDetail(html);

        const preferredDetailText = detail.detailText
          ? [("title" in detail ? detail.title : item.title) || item.title, detail.detailText]
              .filter(Boolean)
              .join(" ")
              .trim()
          : "";
        const normalizedText = [preferredDetailText, item.normalizedText]
          .filter(Boolean)
          .join(" ")
          .trim();
        const detailPublishedText =
          "publishedText" in detail ? detail.publishedText : undefined;
        const detailPublishedAt =
          "publishedAt" in detail ? detail.publishedAt : undefined;
        const metadata = {
          ...item.metadata,
          ...(detailPublishedText ? { detailPublishedText } : {})
        };
        const publishedAt = detailPublishedAt ?? item.publishedAt;

        return {
          ...item,
          normalizedText,
          metadata,
          publishedAt,
          contentHash: hashContent(
            `detail-v3|${item.title}|${item.sourceUrl}|${publishedAt ?? ""}|${normalizedText}`
          )
        } satisfies NormalizedSourceItem;
      } catch {
        return item;
      }
    })
  );
}

export async function extractPdfDocumentDetail(source: ArrayBuffer | Uint8Array | Buffer) {
  const buffer = Buffer.isBuffer(source)
    ? source
    : source instanceof Uint8Array
      ? Buffer.from(source)
      : Buffer.from(source);

  const parsed = await pdfParse(buffer);
  const rawText = parsed.text.replace(/\r/g, "\n");
  const fullText = clampText(compactText(rawText), 12000);
  const blocks = rawText
    .split(/\n\s*\n+/)
    .map((block: string) => compactText(block.replace(/\n+/g, " ")))
    .filter((block: string) => block.length >= 50);
  const highlightText = clampText(selectPdfHighlights(blocks).join(" "), 3600);
  const confidence = derivePdfConfidence(fullText.length, parsed.numpages ?? 0, highlightText.length);

  return {
    fullText,
    highlightText,
    pageCount: parsed.numpages ?? 0,
    confidence
  };
}

function shouldFetchItemDetail(sourceSlug: string, sourceUrl: string, sourcePageUrl: string) {
  if (sourceSlug === "permit-faq") {
    return false;
  }

  if (sourceUrl === sourcePageUrl) {
    return false;
  }

  if (HTML_DETAIL_SOURCE_SLUGS.has(sourceSlug)) {
    const lower = sourceUrl.toLowerCase();

    if (
      lower.includes("/documentcenter/view/") ||
      lower.endsWith(".pdf") ||
      lower.includes("/archivecenter/viewfile/")
    ) {
      return false;
    }

    return true;
  }

  return PDF_DETAIL_SOURCE_SLUGS.has(sourceSlug);
}

function isPdfResponse(contentType: string, finalUrl: string, sourceUrl: string) {
  const finalLower = finalUrl.toLowerCase();
  const sourceLower = sourceUrl.toLowerCase();

  return (
    contentType.includes("application/pdf") ||
    finalLower.includes("/archivecenter/viewfile/") ||
    finalLower.includes("/documentcenter/view/") ||
    sourceLower.endsWith(".pdf")
  );
}

function selectPdfHighlights(blocks: string[]) {
  const scored = blocks
    .map((block, index) => ({
      block,
      index,
      score: scorePdfBlock(block)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 5)
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.block);

  if (scored.length > 0) {
    return scored;
  }

  return blocks.slice(0, 3);
}

function scorePdfBlock(block: string) {
  const lower = block.toLowerCase();
  let score = 0;

  if (block.length > 100 && block.length < 1200) {
    score += 1;
  }

  if (PDF_HIGHLIGHT_TERMS.some((term) => lower.includes(term))) {
    score += 4;
  }

  if (/motion was made|recommend approval|public comment|time extension|discussion/i.test(block)) {
    score += 3;
  }

  if (/subdivision|land development|plan|zoning|ordinance|hearing/i.test(block)) {
    score += 2;
  }

  if (PDF_LOW_SIGNAL_TERMS.some((term) => lower.includes(term))) {
    score -= 3;
  }

  return score;
}

function derivePdfConfidence(fullTextLength: number, pageCount: number, highlightLength: number) {
  if (fullTextLength >= 2000 && pageCount >= 2 && highlightLength >= 150) {
    return 0.91;
  }

  if (fullTextLength >= 900) {
    return 0.86;
  }

  return 0.8;
}

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}
