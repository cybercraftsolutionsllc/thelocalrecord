import { createHash } from "node:crypto";

import { z } from "zod";

export const PLATFORM_DISCLAIMER =
  "Independent resident-run digest platform. Not an official municipal website or emergency alert service.";

export const INDEPENDENT_DISCLAIMER =
  "Independent resident-run digest. Not affiliated with or speaking for this municipality.";

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

export const impactLevelSchema = z.enum([
  "critical_source",
  "important",
  "routine"
]);

export const contentDecisionSchema = z.object({
  classification: classificationSchema,
  impactLevel: impactLevelSchema.default("routine"),
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
  }),
  municipalitySchema.parse({
    slug: "lancastercitypa",
    name: "Lancaster City",
    state: "Pennsylvania",
    localityType: "City",
    shortName: "Lancaster City, PA",
    disclaimer: INDEPENDENT_DISCLAIMER,
    about:
      "Planned resident coverage for Lancaster City official records, notices, meetings, services, and source-linked updates.",
    correctionsEmail: "cyber.craft@craftedcybersolutions.com"
  }),
  municipalitySchema.parse({
    slug: "easthempfieldtownshippa",
    name: "East Hempfield Township",
    state: "Pennsylvania",
    localityType: "Township",
    shortName: "East Hempfield Township, PA",
    disclaimer: INDEPENDENT_DISCLAIMER,
    about:
      "Planned resident coverage for East Hempfield Township official records, agendas, roadway projects, permits, and source-linked updates.",
    correctionsEmail: "cyber.craft@craftedcybersolutions.com"
  }),
  municipalitySchema.parse({
    slug: "warwicktownshippa",
    name: "Warwick Township",
    state: "Pennsylvania",
    localityType: "Township",
    shortName: "Warwick Township, PA",
    disclaimer: INDEPENDENT_DISCLAIMER,
    about:
      "Planned resident coverage for Warwick Township official records, agendas, township news, public works notices, and source-linked updates.",
    correctionsEmail: "cyber.craft@craftedcybersolutions.com"
  }),
  municipalitySchema.parse({
    slug: "lancastertownshippa",
    name: "Lancaster Township",
    state: "Pennsylvania",
    localityType: "Township",
    shortName: "Lancaster Township, PA",
    disclaimer: INDEPENDENT_DISCLAIMER,
    about:
      "Fallback Lancaster-area coverage candidate for official township records, agendas, alerts, road notices, and resident source trails.",
    correctionsEmail: "cyber.craft@craftedcybersolutions.com"
  })
];

export const sourceRegistry: SourceConfig[] = [
  {
    slug: "agenda-center",
    municipalitySlug: "manheimtownshippa",
    name: "Agenda Center",
    description:
      "Agendas and approved minutes published through the township agenda portal.",
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
    implemented: true,
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
    implemented: true,
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
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Public information"
  },
  {
    slug: "code-compliance",
    municipalitySlug: "manheimtownshippa",
    name: "Code Compliance",
    description:
      "Official code compliance, permit, inspection, occupancy, and building-code resources.",
    url: "https://www.manheimtownship.org/865/Code-Compliance",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Permits and code"
  },
  {
    slug: "code-news",
    municipalitySlug: "manheimtownshippa",
    name: "Code Department News and Information",
    description: "Official code compliance department news posts and notices.",
    url: "https://www.manheimtownship.org/CivicAlerts.aspx?CID=8",
    kind: "news_flash",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Permits and code"
  },
  {
    slug: "permit-faq",
    municipalitySlug: "manheimtownshippa",
    name: "Permit and Code Compliance FAQs",
    description:
      "Official FAQs covering permits, occupancy, roofing, and code questions.",
    url: "https://www.manheimtownship.org/Faq.aspx?TID=49",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Permits and code"
  },
  {
    slug: "planning-zoning-faq",
    municipalitySlug: "manheimtownshippa",
    name: "Planning and Zoning FAQs",
    description:
      "Official FAQs covering zoning, signs, beekeeping, home occupations, and related land-use questions.",
    url: "https://www.manheimtownship.org/1546/Planning-Zoning-FAQs",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Planning and zoning"
  },
  {
    slug: "comprehensive-plan",
    municipalitySlug: "manheimtownshippa",
    name: "Comprehensive Plan Homepage",
    description:
      "Official comprehensive plan documents, dashboard updates, and implementation materials.",
    url: "https://www.manheimtownship.org/64/Comprehensive-Plan-Homepage",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Planning and zoning"
  },
  {
    slug: "planning-commission-agendas",
    municipalitySlug: "manheimtownshippa",
    name: "Planning Commission Agendas Archive",
    description:
      "Official planning commission agenda archive for pending development and zoning discussions.",
    url: "https://www.manheimtownship.org/Archive.aspx?AMID=80",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Agendas and minutes"
  },
  {
    slug: "planning-commission-minutes",
    municipalitySlug: "manheimtownshippa",
    name: "Planning Commission Minutes Archive",
    description:
      "Official planning commission minutes archive with project discussion and action records.",
    url: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Agendas and minutes"
  },
  {
    slug: "planning-commission",
    municipalitySlug: "manheimtownshippa",
    name: "Planning Commission",
    description:
      "Official board page with planning commission meeting information, member details, and archives.",
    url: "https://www.manheimtownship.org/882/Planning-Commission",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Planning and zoning"
  },
  {
    slug: "zoning-hearing-board",
    municipalitySlug: "manheimtownshippa",
    name: "Zoning Hearing Board",
    description:
      "Official board page with zoning hearing board meeting information, archives, and member details.",
    url: "https://www.manheimtownship.org/886/Zoning-Hearing-Board",
    kind: "page",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Planning and zoning"
  },
  {
    slug: "planning-zoning",
    municipalitySlug: "manheimtownshippa",
    name: "Planning and Zoning",
    description:
      "Official planning and zoning materials published by the township.",
    url: "https://www.manheimtownship.org/478/Planning-Zoning",
    kind: "planning_zoning",
    implemented: true,
    fetchStrategy: "html",
    publicCategory: "Planning and zoning"
  },
  {
    slug: "lancaster-city-home",
    municipalitySlug: "lancastercitypa",
    name: "Lancaster City Homepage",
    description:
      "Official city homepage with links to services, city news, events, legal notices, permits, and street closures.",
    url: "https://www.cityoflancasterpa.gov/",
    kind: "page",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Coverage planned"
  },
  {
    slug: "lancaster-city-legal-notices",
    municipalitySlug: "lancastercitypa",
    name: "Legal Notices",
    description:
      "Official city legal notices and pending legislation or resolution records planned for future ingest.",
    url: "https://www.cityoflancasterpa.gov/",
    kind: "page",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Public notices"
  },
  {
    slug: "east-hempfield-home",
    municipalitySlug: "easthempfieldtownshippa",
    name: "East Hempfield Township Homepage",
    description:
      "Official township homepage with agendas, public meeting calendar, roadway projects, forms, permits, and announcements.",
    url: "https://www.easthempfield.org/",
    kind: "page",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Coverage planned"
  },
  {
    slug: "east-hempfield-agendas",
    municipalitySlug: "easthempfieldtownshippa",
    name: "Agendas and Minutes",
    description:
      "Official agendas and minutes page planned for source-linked meeting coverage.",
    url: "https://www.easthempfield.org/",
    kind: "agenda_center",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Agendas and minutes"
  },
  {
    slug: "warwick-home",
    municipalitySlug: "warwicktownshippa",
    name: "Warwick Township Homepage",
    description:
      "Official township homepage with news, calendar items, agendas, parks, public works notices, and resident services.",
    url: "https://www.warwicktownship.org/1/Home",
    kind: "page",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Coverage planned"
  },
  {
    slug: "warwick-news",
    municipalitySlug: "warwicktownshippa",
    name: "News Flash",
    description:
      "Official township news area planned for notices such as road work, utility work, public meetings, and service updates.",
    url: "https://www.warwicktownship.org/1/Home",
    kind: "news_flash",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Official news"
  },
  {
    slug: "lancaster-township-home",
    municipalitySlug: "lancastertownshippa",
    name: "Lancaster Township Homepage",
    description:
      "Official township homepage with alerts, announcements, road notices, permits, agendas, and resident services.",
    url: "https://www.twp.lancaster.pa.us/",
    kind: "page",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Coverage planned"
  },
  {
    slug: "lancaster-township-agendas",
    municipalitySlug: "lancastertownshippa",
    name: "Agendas and Minutes",
    description:
      "Official agendas and minutes area planned as a fallback Lancaster-area meeting source.",
    url: "https://www.twp.lancaster.pa.us/",
    kind: "agenda_center",
    implemented: false,
    fetchStrategy: "html",
    publicCategory: "Agendas and minutes"
  }
].map((source) => sourceConfigSchema.parse(source));

export function getMunicipalityBySlug(
  slug: string
): MunicipalityConfig | undefined {
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
