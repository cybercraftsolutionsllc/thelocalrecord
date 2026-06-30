import type { PublicEntry } from "./data";

export type ResidentLaneKey =
  | "all"
  | "roads"
  | "hearings"
  | "money"
  | "growth"
  | "parks"
  | "permits"
  | "meetings"
  | "general";

export const residentLaneLabels: Record<ResidentLaneKey, string> = {
  all: "All",
  roads: "Roads & closures",
  hearings: "Votes & hearings",
  money: "Money & budgets",
  growth: "Growth & zoning",
  parks: "Parks & services",
  permits: "Permits & code",
  meetings: "Meetings",
  general: "Township news"
};

export const residentLaneOrder: ResidentLaneKey[] = [
  "all",
  "roads",
  "hearings",
  "money",
  "growth",
  "parks",
  "permits",
  "meetings",
  "general"
];

const monthIndexes: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

function haystack(entry: PublicEntry) {
  return `${entry.title} ${entry.summary} ${entry.category} ${entry.sourceLabel} ${entry.topicText ?? ""}`.toLowerCase();
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function getResidentLane(entry: PublicEntry): ResidentLaneKey {
  const text = haystack(entry);

  if (
    includesAny(text, [
      "audit",
      "auditor",
      "budget",
      "indebtedness",
      "debt",
      "general obligation",
      "note",
      "tax",
      "rfp",
      "request for proposals",
      "billing services",
      "capital improvements",
      "golf course"
    ])
  ) {
    return "money";
  }

  if (
    includesAny(text, [
      "road",
      "route",
      "bridge",
      "traffic",
      "closure",
      "closed",
      "detour",
      "line painting",
      "parking",
      "street dedication",
      "highway",
      "interchange",
      "trail"
    ])
  ) {
    return "roads";
  }

  if (
    includesAny(text, [
      "ordinance",
      "public meeting",
      "consider and vote",
      "vote on",
      "hearing",
      "legal notice",
      "board of commissioners",
      "public input",
      "comment"
    ])
  ) {
    return "hearings";
  }

  if (
    includesAny(text, [
      "planning",
      "zoning",
      "development",
      "subdivision",
      "land development",
      "comprehensive plan",
      "residential",
      "dwelling",
      "variance",
      "conditional use"
    ])
  ) {
    return "growth";
  }

  if (
    includesAny(text, [
      "park",
      "library",
      "recreation",
      "program",
      "facility",
      "facilities",
      "earth fest",
      "trout",
      "volunteer",
      "auction"
    ])
  ) {
    return "parks";
  }

  if (
    includesAny(text, [
      "permit",
      "inspection",
      "code compliance",
      "occupancy",
      "building code",
      "rental housing"
    ])
  ) {
    return "permits";
  }

  if (
    entry.category === "agenda_posted" ||
    entry.category === "approved_minutes" ||
    includesAny(text, ["agenda", "minutes", "meeting"])
  ) {
    return "meetings";
  }

  return "general";
}

export function formatRecordDate(value?: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getImportanceLabel(impactLevel?: string | null) {
  switch (impactLevel) {
    case "critical_source":
      return "Critical source";
    case "important":
      return "Important";
    default:
      return "Routine";
  }
}

export function isImportantEntry(entry: PublicEntry) {
  return entry.impactLevel === "critical_source" || entry.impactLevel === "important";
}

export function getResidentAction(entry: PublicEntry) {
  const text = haystack(entry);
  const lane = getResidentLane(entry);

  if (lane === "roads") {
    if (includesAny(text, ["closed", "closure", "detour"])) {
      return "Check the route and timing before you travel.";
    }

    if (text.includes("line painting")) {
      return "Avoid marked wet-paint areas and watch township updates.";
    }

    return "Review the affected street, route, or access point.";
  }

  if (lane === "hearings") {
    return "Review before the public meeting or vote date.";
  }

  if (lane === "money") {
    return "Open the source if budget, debt, contract, or audit details matter to you.";
  }

  if (lane === "growth") {
    return "Check the project location, conditions, and next meeting record.";
  }

  if (lane === "parks") {
    return "Check the source for facility, program, or participation details.";
  }

  if (lane === "permits") {
    return "Verify requirements with the official permit or code source.";
  }

  if (lane === "meetings") {
    return "Use the source to confirm agenda, minutes, or attendance details.";
  }

  return "Open the official source before you act.";
}

export function getWhyItMatters(entry: PublicEntry) {
  const lane = getResidentLane(entry);

  switch (lane) {
    case "roads":
      return "May affect driving, parking, access, or daily routes.";
    case "hearings":
      return "May include a public decision, vote, or comment window.";
    case "money":
      return "May affect township spending, debt, contracts, or financial transparency.";
    case "growth":
      return "May affect land use, nearby development, traffic, or neighborhood change.";
    case "parks":
      return "May affect public facilities, recreation, library, parks, or events.";
    case "permits":
      return "May affect property work, inspections, occupancy, or code requirements.";
    case "meetings":
      return "May contain details that are not obvious from the headline.";
    default:
      return "A source-linked township update residents may want to verify.";
  }
}

export function getDateToKnow(entry: PublicEntry, now = new Date()) {
  const text = `${entry.title} ${entry.summary}`;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mentions = extractDateMentions(text, now.getUTCFullYear())
    .filter((mention) => mention.date.getTime() >= today.getTime())
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  return mentions[0]?.label ?? null;
}

export function buildRecordSignal(entry: PublicEntry, now = new Date()) {
  const lane = getResidentLane(entry);

  return {
    lane,
    laneLabel: residentLaneLabels[lane],
    importanceLabel: getImportanceLabel(entry.impactLevel),
    important: isImportantEntry(entry),
    dateToKnow: getDateToKnow(entry, now),
    sourceDate: formatRecordDate(entry.sourceMaterialDate ?? entry.publishedAt),
    action: getResidentAction(entry),
    why: getWhyItMatters(entry)
  };
}

function extractDateMentions(text: string, fallbackYear: number) {
  const mentions: Array<{ label: string; date: Date }> = [];
  const datePattern =
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?(?:,\s*)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*(\d{4}))?(?:\s+at\s+([0-9:]+\s*(?:a\.m\.|p\.m\.|am|pm)))?/gi;
  let match: RegExpExecArray | null;

  while ((match = datePattern.exec(text)) !== null) {
    const monthName = match[1].toLowerCase();
    const day = Number(match[2]);
    const year = Number(match[3] ?? fallbackYear);
    const month = monthIndexes[monthName];

    if (!Number.isInteger(day) || month === undefined || day < 1 || day > 31) {
      continue;
    }

    const date = new Date(Date.UTC(year, month, day));

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    mentions.push({
      label: match[0].replace(/\s+/g, " ").trim(),
      date
    });
  }

  return mentions;
}
