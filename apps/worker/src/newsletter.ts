import { getMunicipalityBySlug } from "@thelocalrecord/core";

import {
  createOrUpdateNewsletterIssue,
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
  categoryLabel: string;
  sourceName: string;
  sourceMaterialDate: string | null;
  sourceUrl: string | null;
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

export async function generateWeeklyNewsletterIssue(
  env: WorkerEnv,
  municipalitySlug: string,
  now = new Date()
): Promise<WeeklyNewsletterResult> {
  const municipality = getMunicipalityBySlug(municipalitySlug);

  if (!municipality) {
    throw new Error(`Unknown municipality slug: ${municipalitySlug}`);
  }

  const periodEnd = startOfCurrentHour(now);
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekKey = periodEnd.toISOString().slice(0, 10);
  const entries = (await listNewsletterDigestEntries(env.DB, municipalitySlug, {
    startIso: periodStart.toISOString(),
    endIso: periodEnd.toISOString(),
    limit: 24
  })).filter(isResidentFacingNewsletterEntry);

  if (entries.length === 0) {
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

  const topEntries = entries.slice(0, 8).map(toRenderableEntry);
  const subject = `${municipality.shortName} weekly digest: ${formatRange(periodStart, periodEnd)}`;
  const intro = buildIssueIntro(topEntries);
  const issue = await createOrUpdateNewsletterIssue(env.DB, {
    municipalitySlug,
    weekKey,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    subject,
    intro,
    entriesJson: JSON.stringify(topEntries),
    status: "generated",
    deliveryNotes: "Issue generated."
  });

  const subscriptions = await listActiveNewsletterSubscriptions(env.DB, municipalitySlug);

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
      subscriptionCount: subscriptions.length,
      entryCount: topEntries.length,
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
      entryCount: topEntries.length,
      deliveryNotes: "Issue generated. No active newsletter subscribers."
    };
  }

  const baseSiteUrl = env.NEXT_PUBLIC_SITE_URL ?? "https://thelocalrecord.org";
  let deliveredCount = 0;
  const failures: string[] = [];

  for (const subscription of subscriptions) {
    try {
      const manageUrl = `${baseSiteUrl}/newsletter/manage?token=${encodeURIComponent(subscription.manage_token)}`;
      await sendResendEmail(env, {
        to: subscription.email,
        subject,
        html: renderNewsletterHtml({
          municipalityName: municipality.shortName,
          intro,
          entries: topEntries,
          manageUrl
        }),
        text: renderNewsletterText({
          municipalityName: municipality.shortName,
          intro,
          entries: topEntries,
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
      ? `Delivered to ${deliveredCount}/${subscriptions.length} subscribers. ${failures.join(" | ")}`
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
    subscriptionCount: subscriptions.length,
    entryCount: topEntries.length,
    deliveryNotes
  };
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

function toRenderableEntry(entry: NewsletterDigestEntry): NewsletterRenderableEntry {
  return {
    title: entry.title,
    summary: entry.summary,
    categoryLabel: CATEGORY_LABELS[entry.category] ?? entry.category,
    sourceName: entry.source_name,
    sourceMaterialDate: entry.source_material_date,
    sourceUrl: parsePrimarySourceUrl(entry.source_links_json)
  };
}

function parsePrimarySourceUrl(sourceLinksJson: string) {
  try {
    const parsed = JSON.parse(sourceLinksJson) as Array<{ url?: string }>;
    return parsed.find((link) => typeof link?.url === "string")?.url ?? null;
  } catch {
    return null;
  }
}

function buildIssueIntro(entries: NewsletterRenderableEntry[]) {
  const categoryCounts = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.categoryLabel] = (counts[entry.categoryLabel] ?? 0) + 1;
    return counts;
  }, {});
  const highlights = Object.entries(categoryCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label, count]) => `${count} ${label.toLowerCase()}`)
    .join(", ");

  if (!highlights) {
    return "A weekly source-linked roundup of the most notable local items from the past seven days.";
  }

  return `This week's digest highlights ${highlights} from the past seven days, with links back to each original source.`;
}

function renderNewsletterHtml(args: {
  municipalityName: string;
  intro: string;
  entries: NewsletterRenderableEntry[];
  manageUrl: string;
}) {
  const entryMarkup = args.entries
    .map(
      (entry) => `
        <li style="margin:0 0 24px 0;padding:0;">
          <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9b5c3f;font-weight:700;">${escapeHtml(entry.categoryLabel)}</p>
          <h2 style="margin:0 0 8px 0;font-size:24px;line-height:1.2;color:#214d46;font-family:Georgia,serif;">${escapeHtml(entry.title)}</h2>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#32433f;">${escapeHtml(entry.summary)}</p>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#5d6b67;">Source: ${escapeHtml(entry.sourceName)}${entry.sourceMaterialDate ? ` · ${escapeHtml(formatDate(entry.sourceMaterialDate))}` : ""}</p>
          ${
            entry.sourceUrl
              ? `<a href="${escapeAttribute(entry.sourceUrl)}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #d7ddd8;color:#214d46;text-decoration:none;font-size:14px;font-weight:600;">Open source</a>`
              : ""
          }
        </li>`
    )
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
        `Source: ${entry.sourceName}${entry.sourceMaterialDate ? ` (${formatDate(entry.sourceMaterialDate)})` : ""}`,
        entry.sourceUrl ? `Open source: ${entry.sourceUrl}` : ""
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
