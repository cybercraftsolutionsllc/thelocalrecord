export type EntryTopicKey =
  | "all"
  | "events_and_meetings"
  | "township_news"
  | "alerts_and_closures"
  | "housing_and_growth"
  | "land_development"
  | "permits_and_code"
  | "minutes_and_agendas";

export const entryTopicLabels: Record<EntryTopicKey, string> = {
  all: "All updates",
  events_and_meetings: "Events & meetings",
  township_news: "Township news",
  alerts_and_closures: "Alerts & closures",
  housing_and_growth: "Housing & growth",
  land_development: "Land development",
  permits_and_code: "Permits & code",
  minutes_and_agendas: "Minutes & agendas"
};

export const entryTopicDisplayOrder: EntryTopicKey[] = [
  "all",
  "housing_and_growth",
  "land_development",
  "events_and_meetings",
  "alerts_and_closures",
  "township_news",
  "minutes_and_agendas",
  "permits_and_code"
];

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function getEntryTopic(args: {
  title: string;
  summary: string;
  category: string;
  sourceLabel?: string;
  topicText?: string;
}): EntryTopicKey {
  const haystack = `${args.title} ${args.summary} ${args.category} ${args.sourceLabel ?? ""} ${args.topicText ?? ""}`.toLowerCase();

  if (
    includesAny(haystack, [
      "housing",
      "residential",
      "dwelling unit",
      "dwelling units",
      "apartment",
      "apartments",
      "homes",
      "new homes",
      "townhome",
      "townhomes",
      "multi-family",
      "multifamily",
      "single-family",
      "subdivision",
      "subdivisions",
      "ashford meadows",
      "development proposal",
      "proposed development",
      "residential development",
      "housing development",
      "planned development",
      "homebuilding",
      "home construction",
      "senior living",
      "affordable housing",
      "accessory dwelling unit"
    ])
  ) {
    return "housing_and_growth";
  }

  if (
    includesAny(haystack, [
      "rezoning",
      "variance",
      "conditional use",
      "land development",
      "development plan",
      "preliminary/final",
      "preliminary plan",
      "final plan",
      "subdivision",
      "planning",
      "zoning",
      "ordinance"
    ])
  ) {
    return "land_development";
  }

  if (
    includesAny(haystack, [
      "permit",
      "permits",
      "code compliance",
      "building code",
      "occupancy",
      "stormwater management plan",
      "code enforcement",
      "rental housing",
      "ucc",
      "icc",
      "inspection"
    ])
  ) {
    return "permits_and_code";
  }

  if (
    includesAny(haystack, [
      "agenda",
      "minutes"
    ])
  ) {
    return "minutes_and_agendas";
  }

  if (
    includesAny(haystack, [
      "meeting",
      "calendar",
      "presentation",
      "board of commissioners",
      "survey",
      "event"
    ])
  ) {
    return "events_and_meetings";
  }

  if (
    includesAny(haystack, [
      "alert",
      "closure",
      "closed",
      "road",
      "traffic",
      "detour",
      "water",
      "utility",
      "service"
    ])
  ) {
    return "alerts_and_closures";
  }

  return "township_news";
}
