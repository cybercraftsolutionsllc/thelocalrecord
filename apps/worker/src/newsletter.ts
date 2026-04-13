import { getMunicipalityBySlug } from "@thelocalrecord/core";

import {
  createOrUpdateNewsletterIssue,
  issueNewsletterManageToken,
  listActiveNewsletterSubscriptions,
  listNewsletterDigestEntries,
  markNewsletterIssueSent,
  recordNewsletterDelivery,
  type NewsletterDigestEntry
} from "./d1";
import type { WorkerEnv } from "./env";

type WeeklyNewsletterResult = {
  ok: boolean;
  municipalitySlug: string;
  generated: boolean;
  delivered: boolean;
  issueId?: string;
  subscriptionCount: number;
  entryCount: number;
  deliveryNotes: string;
};

type NewsletterRenderableEntry = {
  title: string;
  summary: string;
  whyItMatters: string;
  categoryLabel: string;
  sourceName: string;
  sourceMaterialDate: string | null;
  sourceUrl: string | null;
  sourceUrlLabel: string;
  detailUrl: string;
};

type NewsletterDraftEnrichment = {
  intro: string;
  items: Array<{
    index: number;
    whyItMatters: string;
  }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  official_news: "Township news",
  official_alert: "Official alert",
  agenda_posted: "Agenda posted",
  approved_minutes: "Meeting minutes",
  meeting_notice: "Meeting notice",
  calendar_update: "Calendar update",
  planning_zoning: "Planning and zoning",
  service_notice: "Service notice"
};

const NEWSLETTER_ENRICHMENT_PROMPT = `You are drafting a weekly email for an independent resident-run local digest.

Use only the supplied evidence.
Your job is to make the email more useful than a raw recap by briefly explaining why each item matters to residents.

Rules:
- Do not invent impacts, approvals, deadlines, legal effects, or outcomes.
- Do not imply a project was approved unless the evidence explicitly says so.
- Avoid repeating the title word-for-word.
- Keep the intro to 2 sentences max.
- Keep each whyItMatters note to 1 sentence.
- Be specific, plainspoken, and practical.
- If the evidence only supports "worth watching" or "worth reading directly," say that instead of speculating.

Return JSON only.`;

export async function generateWeeklyNewsletterIssue(
  env: WorkerEnv,
  municipalitySlug: string,
  now = new Date()
): Promise<WeeklyNewsletterResult> {
  const municipality = getMunicipalityBySlug(municipalitySlug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${municipalitySlug}`);
  }

  const baseSiteUrl = normalizeSiteBaseUrl(
    env.NEXT_PUBLIC_SITE_URL ?? "https://thelocalrecord.org"
  );
  const periodEnd = startOfCurrentHour(now);
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekKey = periodEnd.toISOString().slice(0, 10);
  const sourceEntries = (await listNewsletterDigestEntries(env.DB, municipalitySlug, {
    startIso: periodStart.toISOString(),
    endIso: periodEnd.toISOString(),
    limit: 24
  }))
    .filter(isResidentFacingNewsletterEntry)
    .sort(compareNewsletterEntries);

  if (sourceEntries.length === 0) {
    return {
      ok: true,
      municipalitySlug,
      generated: false,
      delivered: false,
      subscriptionCount: 0,
      entryCount: 0,
      deliveryNotes: "No qualifying entries in the weekly window."
    };
  }

  const selectedEntries = sourceEntries.slice(0, 8);
  let renderableEntries = selectedEntries.map((entry) =>
    toRenderableEntry(entry, municipalitySlug, baseSiteUrl)
  );
  const enrichment = await maybeEnrichNewsletterDraft(
    env,
    municipality.shortName,
    selectedEntries
  );
  const enrichmentByIndex = new Map(
    (enrichment?.items ?? []).map((item) => [item.index, normalizeSentence(item.whyItMatters)])
  );

  renderableEntries = renderableEntries.map((entry, index) => ({
    ...entry,
    whyItMatters:
      enrichmentByIndex.get(index) ??
      buildFallbackWhyItMatters(selectedEntries[index])
  }));

  const subject = `${municipality.shortName}: events of note for ${formatRange(periodStart, periodEnd)}`;
  const intro = normalizeIntro(
    enrichment?.intro ?? buildIssueIntro(renderableEntries)
  );
  const issue = await createOrUpdateNewsletterIssue(env.DB, {
    municipalitySlug,
    weekKey,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    subject,
    intro,
    entriesJson: JSON.stringify(renderableEntries),
    status: "generated",
    deliveryNotes: "Issue generated."
  });

  const subscriptions = await listActiveNewsletterSubscriptions(env.DB, municipalitySlug);
  const pendingSubscriptions = subscriptions.filter(
    (subscription) => subscription.last_sent_issue_id !== issue.id
  );

  if (!env.RESEND_API_KEY || !env.NEWSLETTER_FROM_EMAIL) {
    await markNewsletterIssueSent(env.DB, {
      issueId: issue.id,
      status: "ready_without_delivery",
      deliveryNotes: "Issue generated. Delivery skipped because newsletter email settings are missing."
    });

    return {
      ok: true,
      municipalitySlug,
      generated: true,
      delivered: false,
      issueId: issue.id,
      subscriptionCount: pendingSubscriptions.length,
      entryCount: renderableEntries.length,
      deliveryNotes: "Issue generated. Delivery skipped because newsletter email settings are missing."
    };
  }

  if (subscriptions.length === 0) {
    await markNewsletterIssueSent(env.DB, {
      issueId: issue.id,
      status: "ready_without_subscribers",
      deliveryNotes: "Issue generated. No active newsletter subscribers."
    });

    return {
      ok: true,
      municipalitySlug,
      generated: true,
      delivered: false,
      issueId: issue.id,
      subscriptionCount: 0,
      entryCount: renderableEntries.length,
      deliveryNotes: "Issue generated. No active newsletter subscribers."
    };
  }

  if (pendingSubscriptions.length === 0) {
    return {
      ok: true,
      municipalitySlug,
      generated: true,
      delivered: true,
      issueId: issue.id,
      subscriptionCount: subscriptions.length,
      entryCount: renderableEntries.length,
      deliveryNotes: "Issue already delivered to current active subscribers."
    };
  }

  let deliveredCount = 0;
  const failures: string[] = [];

  for (const subscription of pendingSubscriptions) {
    try {
      const manageToken = await issueNewsletterManageToken(env.DB, subscription.id);
      const manageUrl = `${baseSiteUrl}/newsletter/manage?token=${encodeURIComponent(manageToken)}`;
      await sendResendEmail(env, {
        to: subscription.email,
        subject,
        html: renderNewsletterHtml({
          municipalityName: municipality.shortName,
          intro,
          entries: renderableEntries,
          manageUrl
        }),
        text: renderNewsletterText({
          municipalityName: municipality.shortName,
          intro,
          entries: renderableEntries,
          manageUrl
        })
      });
      deliveredCount += 1;
      await recordNewsletterDelivery(env.DB, {
        subscriptionId: subscription.id,
        issueId: issue.id
      });
    } catch (error) {
      failures.push(
        `${subscription.email}: ${error instanceof Error ? error.message : "Unknown email delivery failure"}`
      );
    }
  }

  const delivered = deliveredCount > 0;
  const deliveryNotes =
    failures.length > 0
      ? `Delivered to ${deliveredCount}/${pendingSubscriptions.length} pending subscribers. ${failures.join(" | ")}`
      : `Delivered to ${deliveredCount} subscribers.`;

  await markNewsletterIssueSent(env.DB, {
    issueId: issue.id,
    status: failures.length > 0 ? "partially_sent" : "sent",
    deliveryNotes
  });

  return {
    ok: true,
    municipalitySlug,
    generated: true,
    delivered,
    issueId: issue.id,
    subscriptionCount: pendingSubscriptions.length,
    entryCount: renderableEntries.length,
    deliveryNotes
  };
}

export async function sendNewsletterConfirmationEmail(
  env: WorkerEnv,
  args: {
    email: string;
    municipalityName: string;
    confirmUrl: string;
  }
) {
  if (!env.RESEND_API_KEY || !env.NEWSLETTER_FROM_EMAIL) {
    throw new Error("newsletter_email_unavailable");
  }

  await sendResendEmail(env, {
    to: args.email,
    subject: `Confirm your ${args.municipalityName} weekly digest`,
    html: `
      <div style="background:#f6f0e5;padding:32px 16px;font-family:Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #ece6d9;">
          <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9b5c3f;font-weight:700;">Confirm email</p>
          <h1 style="margin:0 0 16px 0;font-size:34px;line-height:1.08;color:#214d46;font-family:Georgia,serif;">Finish your weekly digest signup</h1>
          <p style="margin:0 0 20px 0;font-size:16px;line-height:1.8;color:#32433f;">Confirm this email address to start receiving a weekly source-linked roundup for ${escapeHtml(args.municipalityName)}.</p>
          <a href="${escapeAttribute(args.confirmUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#214d46;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Confirm subscription</a>
          <p style="margin:20px 0 0 0;font-size:13px;line-height:1.7;color:#5d6b67;">If you did not request this, you can ignore this email.</p>
        </div>
      </div>
    `,
    text: [
      `Finish your ${args.municipalityName} weekly digest signup.`,
      "",
      `Confirm subscription: ${args.confirmUrl}`,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n")
  });
}

function compareNewsletterEntries(left: NewsletterDigestEntry, right: NewsletterDigestEntry) {
  const scoreDifference = scoreNewsletterEntry(right) - scoreNewsletterEntry(left);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const leftDate = left.source_material_date ?? left.published_at;
  const rightDate = right.source_material_date ?? right.published_at;

  return rightDate.localeCompare(leftDate);
}

function scoreNewsletterEntry(entry: NewsletterDigestEntry) {
  const haystack =
    `${entry.title} ${entry.summary} ${entry.source_name} ${entry.topic_text}`.toLowerCase();
  let score = 0;

  switch (entry.category) {
    case "official_alert":
      score += 42;
      break;
    case "official_news":
      score += 34;
      break;
    case "planning_zoning":
      score += 32;
      break;
    case "approved_minutes":
      score += 24;
      break;
    case "service_notice":
      score += 22;
      break;
    case "meeting_notice":
      score += 14;
      break;
    case "agenda_posted":
      score += 10;
      break;
    case "calendar_update":
      score += 8;
      break;
    default:
      score += 4;
      break;
  }

  if (
    /closure|detour|traffic|interchange|road|route 30|route 222|water|sewer|utility|trash|park|trail|survey|alert|master plan|budget|tax|ordinance|hearing/.test(
      haystack
    )
  ) {
    score += 10;
  }

  if (
    /housing|residential|townhome|apartment|dwelling|subdivision|land development|ashford meadows|waiver|conditional use|variance|stormwater|planning commission/.test(
      haystack
    )
  ) {
    score += 12;
  }

  if (
    /call to order|pledge of allegiance|approval of minutes|adjournment|attendance/.test(
      haystack
    )
  ) {
    score -= 8;
  }

  if (
    /permit faq|fee schedule|complaint process|electrical permit|plumbing permit|occupancy permit|roofing permit|application checklist/.test(
      haystack
    )
  ) {
    score -= 22;
  }

  return score;
}

function isResidentFacingNewsletterEntry(entry: NewsletterDigestEntry) {
  const haystack =
    `${entry.title} ${entry.summary} ${entry.source_name} ${entry.topic_text}`.toLowerCase();

  if (
    entry.category === "service_notice" &&
    !/road|closure|detour|utility|water|trash|trail|park|meeting|notice|project|survey|traffic/.test(
      haystack
    )
  ) {
    return false;
  }

  if (
    /permit faq|fee schedule|electrical permit|plumbing permit|occupancy permit|roofing permit|complaint process/.test(
      haystack
    )
  ) {
    return false;
  }

  return true;
}

function toRenderableEntry(
  entry: NewsletterDigestEntry,
  municipalitySlug: string,
  baseSiteUrl: string
): NewsletterRenderableEntry {
  const primarySource = parsePrimarySourceLink(entry.source_links_json);

  return {
    title: entry.title,
    summary: entry.summary,
    whyItMatters: "",
    categoryLabel: CATEGORY_LABELS[entry.category] ?? entry.category,
    sourceName: entry.source_name,
    sourceMaterialDate: entry.source_material_date,
    sourceUrl: primarySource?.url ?? null,
    sourceUrlLabel: primarySource?.label ?? "Open official source",
    detailUrl: `${baseSiteUrl}/${municipalitySlug}/item/?id=${encodeURIComponent(entry.id)}`
  };
}

async function maybeEnrichNewsletterDraft(
  env: WorkerEnv,
  municipalityName: string,
  entries: NewsletterDigestEntry[]
) {
  if (!env.OPENAI_API_KEY || entries.length === 0) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL ?? "gpt-5-mini",
        instructions: NEWSLETTER_ENRICHMENT_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  municipalityName,
                  entries: entries.map((entry, index) => ({
                    index,
                    title: entry.title,
                    category: CATEGORY_LABELS[entry.category] ?? entry.category,
                    summary: entry.summary,
                    sourceName: entry.source_name,
                    sourceMaterialDate: entry.source_material_date,
                    evidenceExcerpt: truncateValue(compactValue(entry.topic_text), 900)
                  }))
                })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "newsletter_digest_enrichment",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                intro: {
                  type: "string"
                },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      index: {
                        type: "integer"
                      },
                      whyItMatters: {
                        type: "string"
                      }
                    },
                    required: ["index", "whyItMatters"]
                  }
                }
              },
              required: ["intro", "items"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      output?: Array<{
        content?: Array<{
          text?: string;
        }>;
      }>;
    };

    const text = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.text)?.text;

    if (!text) {
      return null;
    }

    const parsed = JSON.parse(text) as NewsletterDraftEnrichment;

    return {
      intro: normalizeIntro(parsed.intro),
      items: (parsed.items ?? [])
        .filter(
          (item) =>
            Number.isInteger(item.index) &&
            item.index >= 0 &&
            item.index < entries.length &&
            item.whyItMatters
        )
        .map((item) => ({
          index: item.index,
          whyItMatters: normalizeSentence(item.whyItMatters)
        }))
    } satisfies NewsletterDraftEnrichment;
  } catch {
    return null;
  }
}

function buildFallbackWhyItMatters(sourceEntry: NewsletterDigestEntry) {
  const haystack =
    `${sourceEntry.title} ${sourceEntry.summary} ${sourceEntry.topic_text}`.toLowerCase();

  if (/closure|detour|route 30|route 222|traffic|road|utility|water|sewer|trash/.test(haystack)) {
    return "This may affect travel, access, or day-to-day services, so residents may want to check the dates and locations in the full item.";
  }

  if (/housing|residential|townhome|apartment|dwelling|subdivision|land development|ashford meadows/.test(haystack)) {
    return "This points to a housing or development item moving through township review, with future meetings or decisions worth tracking.";
  }

  if (sourceEntry.category === "planning_zoning" || sourceEntry.category === "approved_minutes") {
    return "This helps track what is moving through public review and what residents may want to watch before the next township meeting.";
  }

  if (sourceEntry.category === "official_alert") {
    return "This appears to be an immediate township update that could affect schedules, access, or short-term planning for residents.";
  }

  if (/ordinance|code|codified/.test(haystack)) {
    return "This looks relevant for residents or property owners who may be affected by township rules or notice language and want the official source.";
  }

  return `This is one of the more notable township items from the past week and is worth scanning in the full digest item if it affects you.`;
}

function parsePrimarySourceLink(sourceLinksJson: string) {
  try {
    const parsed = JSON.parse(sourceLinksJson) as Array<{ label?: string; url?: string }>;
    const candidate = parsed.find((link) => typeof link?.url === "string");

    if (!candidate?.url) {
      return null;
    }

    return {
      url: candidate.url,
      label: relabelSourceLink(candidate.label ?? "Open official source", candidate.url, 0)
    };
  } catch {
    return null;
  }
}

function relabelSourceLink(label: string, url: string, index: number) {
  const lowerLabel = label.toLowerCase();
  const lowerUrl = url.toLowerCase();
  const isDocument =
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes("/documentcenter/view/") ||
    lowerUrl.includes("/archivecenter/viewfile/") ||
    lowerUrl.includes("archive.aspx?adid=");

  if (lowerLabel.includes("source page")) {
    return "Listing page";
  }

  if (lowerLabel.includes("source item")) {
    return isDocument ? "Original document" : "Open official source";
  }

  if (index === 0) {
    return isDocument ? "Original document" : "Open official source";
  }

  return label;
}

function buildIssueIntro(entries: NewsletterRenderableEntry[]) {
  const titles = entries.slice(0, 3).map((entry) => entry.title);

  if (titles.length === 0) {
    return "A source-linked weekly roundup of the most notable local items from the past seven days.";
  }

  if (titles.length === 1) {
    return `This week's digest leads with ${titles[0]}, plus direct links back to the item and the original township source.`;
  }

  return `This week's digest highlights ${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}, with direct links to the digest item and the original township source.`;
}

function renderNewsletterHtml(args: {
  municipalityName: string;
  intro: string;
  entries: NewsletterRenderableEntry[];
  manageUrl: string;
}) {
  const entryMarkup = args.entries
    .map((entry) => {
      const sourceMeta = entry.sourceMaterialDate
        ? `Source: ${escapeHtml(entry.sourceName)} | ${escapeHtml(formatDate(entry.sourceMaterialDate))}`
        : `Source: ${escapeHtml(entry.sourceName)}`;

      return `
        <li style="margin:0 0 28px 0;padding:0;">
          <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9b5c3f;font-weight:700;">${escapeHtml(entry.categoryLabel)}</p>
          <h2 style="margin:0 0 8px 0;font-size:24px;line-height:1.2;color:#214d46;font-family:Georgia,serif;">
            <a href="${escapeAttribute(entry.detailUrl)}" style="color:#214d46;text-decoration:none;">${escapeHtml(entry.title)}</a>
          </h2>
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.75;color:#32433f;">${escapeHtml(entry.summary)}</p>
          <div style="margin:0 0 10px 0;padding:12px 14px;border-radius:18px;background:#f5f0e5;border:1px solid #ece6d9;">
            <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#9b5c3f;font-weight:700;">Why it matters</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#32433f;">${escapeHtml(entry.whyItMatters)}</p>
          </div>
          <p style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:#5d6b67;">${sourceMeta}</p>
          <div>
            <a href="${escapeAttribute(entry.detailUrl)}" style="display:inline-block;margin-right:10px;margin-bottom:10px;padding:10px 16px;border-radius:999px;background:#214d46;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Read in The Local Record</a>
            ${
              entry.sourceUrl
                ? `<a href="${escapeAttribute(entry.sourceUrl)}" style="display:inline-block;margin-bottom:10px;padding:10px 16px;border-radius:999px;border:1px solid #d7ddd8;color:#214d46;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(entry.sourceUrlLabel)}</a>`
                : ""
            }
          </div>
        </li>`;
    })
    .join("");

  return `
    <div style="background:#f6f0e5;padding:32px 16px;font-family:Arial,sans-serif;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #ece6d9;">
        <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9b5c3f;font-weight:700;">Weekly digest</p>
        <h1 style="margin:0 0 16px 0;font-size:38px;line-height:1.05;color:#214d46;font-family:Georgia,serif;">${escapeHtml(args.municipalityName)}</h1>
        <p style="margin:0 0 24px 0;font-size:16px;line-height:1.8;color:#32433f;">${escapeHtml(args.intro)}</p>
        <ul style="list-style:none;margin:0;padding:0;">${entryMarkup}</ul>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #ece6d9;">
          <p style="margin:0 0 10px 0;font-size:13px;line-height:1.7;color:#5d6b67;">Independent resident-run digest. Not affiliated with or speaking for ${escapeHtml(args.municipalityName.replace(", PA", ""))}.</p>
          <p style="margin:0 0 10px 0;font-size:13px;line-height:1.7;color:#5d6b67;">Each item links to The Local Record entry and the original township source.</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#5d6b67;">Manage your subscription: <a href="${escapeAttribute(args.manageUrl)}" style="color:#214d46;">${escapeHtml(args.manageUrl)}</a></p>
        </div>
      </div>
    </div>
  `;
}

function renderNewsletterText(args: {
  municipalityName: string;
  intro: string;
  entries: NewsletterRenderableEntry[];
  manageUrl: string;
}) {
  const entriesText = args.entries
    .map((entry) =>
      [
        `${entry.categoryLabel.toUpperCase()} - ${entry.title}`,
        entry.summary,
        `Why it matters: ${entry.whyItMatters}`,
        `Read in The Local Record: ${entry.detailUrl}`,
        entry.sourceUrl
          ? `${entry.sourceUrlLabel}: ${entry.sourceUrl}`
          : "",
        `Source: ${entry.sourceName}${entry.sourceMaterialDate ? ` (${formatDate(entry.sourceMaterialDate)})` : ""}`
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  return [
    args.municipalityName,
    "",
    args.intro,
    "",
    entriesText,
    "",
    "Independent resident-run digest. Not affiliated with or speaking for the municipality.",
    `Manage your subscription: ${args.manageUrl}`
  ].join("\n");
}

async function sendResendEmail(
  env: WorkerEnv,
  args: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY ?? ""}`
    },
    body: JSON.stringify({
      from: env.NEWSLETTER_FROM_EMAIL,
      to: [args.to],
      reply_to: env.NEWSLETTER_REPLY_TO,
      subject: args.subject,
      html: args.html,
      text: args.text
    })
  });

  if (!response.ok) {
    throw new Error(`Newsletter email failed with status ${response.status}`);
  }
}

function startOfCurrentHour(value: Date) {
  const date = new Date(value);
  date.setMinutes(0, 0, 0);
  return date;
}

function formatRange(start: Date, end: Date) {
  return `${formatDate(start.toISOString())} - ${formatDate(end.toISOString())}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function compactValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateValue(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function normalizeSentence(value: string) {
  const compact = compactValue(value);

  if (compact.length <= 220) {
    return compact;
  }

  return `${compact.slice(0, 217).trimEnd()}...`;
}

function normalizeIntro(value: string) {
  const compact = compactValue(value);

  if (compact.length <= 320) {
    return compact;
  }

  return `${compact.slice(0, 317).trimEnd()}...`;
}

function normalizeSiteBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
