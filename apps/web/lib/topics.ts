export type EntryTopicKey =
  | "all"
  | "events_and_meetings"
  | "township_news"
  | "alerts_and_closures"
  | "land_development"
  | "minutes_and_agendas";

export const entryTopicLabels: Record<EntryTopicKey, string> = {
  all: "All updates",
  events_and_meetings: "Events & meetings",
  township_news: "Township news",
  alerts_and_closures: "Alerts & closures",
  land_development: "Land development",
  minutes_and_agendas: "Minutes & agendas"
};

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function getEntryTopic(args: {
  title: string;
  summary: string;
  category: string;
}): EntryTopicKey {
  const haystack = `${args.title} ${args.summary} ${args.category}`.toLowerCase();

  if (
    includesAny(haystack, [
      "rezoning",
      "variance",
      "conditional use",
      "land development",
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
