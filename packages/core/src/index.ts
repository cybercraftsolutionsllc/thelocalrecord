import { createHash } from "node:crypto";

import { z } from "zod";

export const INDEPENDENT_DISCLAIMER =
  "Independent resident-run digest. Not affiliated with or speaking for Manheim Township.";

export const municipalitySchema = z.object({
  slug: z.string(),
  name: z.string(),
  state: z.string(),
  localityType: z.string(),
  shortName: z.string(),
  disclaimer: z.string(),
  about: z.string(),
  correctionsEmail: z.string().email()
});

export const sourceKindSchema = z.enum([
  "agenda_center",
  "news_flash",
  "alert_center",
  "calendar",
  "planning_zoning",
  "page"
]);

export const sourceConfigSchema = z.object({
  slug: z.string(),
  municipalitySlug: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  kind: sourceKindSchema,
  implemented: z.boolean().default(false),
  fetchStrategy: z.enum(["html", "ical", "pdf", "rss"]).default("html"),
  publicCategory: z.string()
});

export const extractionSchema = z.object({
  method: z.enum(["html", "pdf", "ical", "manual"]),
  confidence: z.number().min(0).max(1),
  note: z.string().optional()
});

export const normalizedSourceItemSchema = z.object({
  municipalitySlug: z.string(),
  sourceSlug: z.string(),
  externalId: z.string(),
  title: z.string(),
  sourceUrl: z.string().url(),
  sourcePageUrl: z.string().url(),
  normalizedText: z.string(),
  publishedAt: z.string().datetime().optional(),
  eventDate: z.string().datetime().optional(),
  categoryHint: z.string().optional(),
  extraction: extractionSchema,
  metadata: z.record(z.string(), z.string()).default({}),
  artifactUrl: z.string().url().optional(),
  contentHash: z.string()
});

export const classificationSchema = z.enum([
  "agenda_posted",
  "meeting_notice",
  "calendar_update",
  "official_alert",
  "official_news",
  "approved_minutes",
  "service_notice",
  "planning_zoning",
  "unknown"
]);

export const riskLevelSchema = z.enum(["low", "review_required"]);

export const reviewStateSchema = z.enum([
  "draft",
  "review_required",
  "approved",
  "auto_published"
]);

export const contentDecisionSchema = z.object({
  classification: classificationSchema,
  riskLevel: riskLevelSchema,
  reviewState: reviewStateSchema,
  autoPublishAllowed: z.boolean(),
  summary: z.string(),
  extractionNote: z.string().optional(),
  rationale: z.array(z.string())
});

export type MunicipalityConfig = z.infer<typeof municipalitySchema>;
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export type NormalizedSourceItem = z.infer<typeof normalizedSourceItemSchema>;
export type ContentDecision = z.infer<typeof contentDecisionSchema>;
export type SourceKind = z.infer<typeof sourceKindSchema>;

export const municipalities: MunicipalityConfig[] = [
  municipalitySchema.parse({
    slug: "manheimtownshippa",
    name: "Manheim Township",
    state: "Pennsylvania",
    localityType: "Township",
    shortName: "Manheim Township, PA",
    disclaimer: INDEPENDENT_DISCLAIMER,
    about:
      "A citizen-run digest that tracks selected public Manheim Township sources, highlights what changed, and links back to the original records.",
    correctionsEmail: "cyber.craft@craftedcybersolutions.com"
  })
];

export const sourceRegistry: SourceConfig[] = [
  {
    slug: "agenda-center",
    municipalitySlug: "manheimtownshippa",
    name: "Agenda Center",
    description: "Agendas and approved minutes published through the township agenda portal.",
    url: "https://www.manheimtownship.org/AgendaCenter",
    kind: "agenda_center",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Agendas and minutes"
  },
  {
    slug: "township-news",
    municipalitySlug: "manheimtownshippa",
    name: "Township News and Information",
    description: "Official township news posts and notices.",
    url: "https://www.manheimtownship.org/CivicAlerts.asp?CID=13",
    kind: "news_flash",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Official news"
  },
  {
    slug: "alert-center",
    municipalitySlug: "manheimtownshippa",
    name: "Alert Center",
    description: "Emergency or urgent public alerts.",
    url: "https://www.manheimtownship.org/AlertCenter.aspx",
    kind: "alert_center",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Alerts"
  },
  {
    slug: "calendar",
    municipalitySlug: "manheimtownshippa",
    name: "Calendar",
    description: "Public meeting and event calendar.",
    url: "https://www.manheimtownship.org/Calendar.aspx",
    kind: "calendar",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Calendar"
  },
  {
    slug: "icalendar",
    municipalitySlug: "manheimtownshippa",
    name: "iCalendar Feed",
    description: "Machine-readable event feed endpoint.",
    url: "https://www.manheimtownship.org/iCalendar.aspx",
    kind: "calendar",
    implemented: false,
    fetchStrategy: "ical",
    publicCategory: "Calendar"
  },
  {
    slug: "view-page",
    municipalitySlug: "manheimtownshippa",
    name: "How Do I / View",
    description: "General township page source inventory entry.",
    url: "https://www.manheimtownship.org/1322/View",
    kind: "page",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Public information"
  },
  {
    slug: "planning-zoning",
    municipalitySlug: "manheimtownshippa",
    name: "Planning and Zoning",
    description: "Planning and zoning materials that often require manual review.",
    url: "https://www.manheimtownship.org/478/Planning-Zoning",
    kind: "planning_zoning",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Planning and zoning"
  }
].map((source) => sourceConfigSchema.parse(source));

export function getMunicipalityBySlug(slug: string): MunicipalityConfig | undefined {
  return municipalities.find((municipality) => municipality.slug === slug);
}

export function getSourcesForMunicipality(slug: string): SourceConfig[] {
  return sourceRegistry.filter((source) => source.municipalitySlug === slug);
}

export function absoluteUrl(href: string, baseUrl: string): string {
  return new URL(href, baseUrl).toString();
}

export function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function hashContent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
