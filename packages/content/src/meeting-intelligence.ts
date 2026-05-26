import type { ContentDecision, NormalizedSourceItem } from "@thelocalrecord/core";
import { compactText } from "@thelocalrecord/core";

export type MeetingFactKind =
  | "decision"
  | "project_update"
  | "public_comment"
  | "next_step"
  | "condition"
  | "recording_reference";

export type MeetingSourceType =
  | "minutes"
  | "agenda"
  | "recording_transcript"
  | "recording"
  | "source_text";

export type MeetingSourceTrailItem = {
  label: string;
  url: string;
  sourceType: MeetingSourceType;
};

export type ExtractedMeetingFact = {
  kind: MeetingFactKind;
  label: string;
  summary: string;
  quote: string | null;
  sourceType: MeetingSourceType;
  sourceUrl: string;
  sourceLabel: string;
  confidence: number;
  transcriptStartSeconds: number | null;
  transcriptEndSeconds: number | null;
  projectName: string | null;
};

export type ExtractedProjectEvent = {
  projectName: string;
  eventKind: "mentioned" | "decision" | "condition" | "next_step";
  summary: string;
  quote: string | null;
  sourceType: MeetingSourceType;
  sourceUrl: string;
  confidence: number;
};

export type MeetingIntelligence = {
  meeting: {
    title: string;
    body: string;
    meetingDate: string | null;
    postedAt: string | null;
    sourceType: MeetingSourceType;
    sourceUrl: string;
    sourceLabel: string;
    sourcePageUrl: string;
    recordingUrl: string | null;
    transcriptUrl: string | null;
  };
  facts: ExtractedMeetingFact[];
  projects: ExtractedProjectEvent[];
  sourceTrail: MeetingSourceTrailItem[];
};

type EvidenceSegment = {
  text: string;
  startSeconds: number | null;
  endSeconds: number | null;
  sourceType: MeetingSourceType;
};

const DECISION_PATTERNS =
  /motion (?:was )?made|motion carried|recommend approval|recommend tabling|table the plan|voted|approved|denied|granted|continued|unanimously/i;
const PROJECT_PATTERNS =
  /subdivision|land development|rezoning|variance|conditional use|waiver|stormwater|residential|dwelling|townhome|apartment|parcel|development plan|preliminary\/final|preliminary|final plan/i;
const PUBLIC_COMMENT_PATTERNS =
  /public comment|resident|neighbor|commented|concern|testified|asked|spoke in favor|spoke against/i;
const NEXT_STEP_PATTERNS =
  /next meeting|scheduled for|will be forwarded|board of commissioners|zoning hearing|public hearing|return to|continue[d]? to|staff review|engineer review/i;
const CONDITION_PATTERNS =
  /conditioned upon|condition|waiver|modification|subject to|contingent|pennDOT|stormwater|staff review letter|engineer review letter/i;

export function extractMeetingIntelligence(
  item: NormalizedSourceItem,
  decision?: Pick<ContentDecision, "classification">
): MeetingIntelligence | null {
  if (!isMeetingRecord(item, decision)) {
    return null;
  }

  const sourceType = inferSourceType(item);
  const metadata = item.metadata ?? {};
  const recordingUrl = firstMetadataUrl(metadata, [
    "recordingUrl",
    "recording_url",
    "videoUrl",
    "video_url",
    "audioUrl",
    "audio_url"
  ]);
  const transcriptUrl = firstMetadataUrl(metadata, [
    "transcriptUrl",
    "transcript_url",
    "captionUrl",
    "caption_url",
    "vttUrl",
    "vtt_url"
  ]);
  const transcriptText = (
    metadata.transcriptText ??
    metadata.transcript ??
    metadata.captions ??
    ""
  ).trim();
  const baseSegments = buildTextSegments(item.normalizedText, sourceType);
  const transcriptSegments = transcriptText
    ? buildTranscriptSegments(transcriptText)
    : [];
  const segments = [...transcriptSegments, ...baseSegments].filter(
    (segment) => segment.text.length >= 24
  );
  const sourceLabel = inferSourceLabel(item, sourceType);
  const facts = buildFacts({
    segments,
    item,
    sourceType,
    sourceLabel,
    recordingUrl,
    transcriptUrl
  });
  const projects = buildProjectEvents(facts, item);

  if (facts.length === 0 && projects.length === 0) {
    return null;
  }

  return {
    meeting: {
      title: item.title,
      body: inferMeetingBody(item),
      meetingDate: item.eventDate ?? null,
      postedAt: item.publishedAt ?? null,
      sourceType,
      sourceUrl: item.sourceUrl,
      sourceLabel,
      sourcePageUrl: item.sourcePageUrl,
      recordingUrl,
      transcriptUrl
    },
    facts,
    projects,
    sourceTrail: buildSourceTrail(item, sourceType, recordingUrl, transcriptUrl)
  };
}

function isMeetingRecord(
  item: NormalizedSourceItem,
  decision?: Pick<ContentDecision, "classification">
) {
  const classification = decision?.classification;
  const haystack = `${item.sourceSlug} ${item.title} ${item.normalizedText}`.toLowerCase();

  if (
    classification === "approved_minutes" ||
    classification === "agenda_posted" ||
    classification === "meeting_notice" ||
    classification === "planning_zoning"
  ) {
    return /meeting|minutes|agenda|commission|board|hearing|zoning|planning/.test(
      haystack
    );
  }

  return /minutes|agenda|meeting|commission|board|hearing|recording|transcript/.test(
    haystack
  );
}

function inferSourceType(item: NormalizedSourceItem): MeetingSourceType {
  const haystack = `${item.sourceSlug} ${item.title}`.toLowerCase();

  if (item.metadata?.transcriptText || item.metadata?.transcript) {
    return "recording_transcript";
  }

  if (item.metadata?.recordingUrl || item.metadata?.videoUrl) {
    return "recording";
  }

  if (/minute/.test(haystack)) {
    return "minutes";
  }

  if (/agenda/.test(haystack)) {
    return "agenda";
  }

  return "source_text";
}

function inferMeetingBody(item: NormalizedSourceItem) {
  const haystack = `${item.sourceSlug} ${item.title}`.toLowerCase();

  if (haystack.includes("planning-commission") || haystack.includes("planning commission")) {
    return "Planning Commission";
  }

  if (haystack.includes("zoning-hearing") || haystack.includes("zoning hearing")) {
    return "Zoning Hearing Board";
  }

  if (haystack.includes("board of commissioners")) {
    return "Board of Commissioners";
  }

  return "Municipal meeting";
}

function inferSourceLabel(
  item: NormalizedSourceItem,
  sourceType: MeetingSourceType
) {
  if (sourceType === "recording_transcript") {
    return "Posted transcript";
  }

  if (sourceType === "recording") {
    return "Meeting recording";
  }

  if (sourceType === "minutes") {
    return "Posted minutes";
  }

  if (sourceType === "agenda") {
    return "Posted agenda";
  }

  return item.sourceSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTextSegments(value: string, sourceType: MeetingSourceType) {
  return splitSentences(value).map((text) => ({
    text,
    startSeconds: null,
    endSeconds: null,
    sourceType
  }));
}

function buildTranscriptSegments(value: string): EvidenceSegment[] {
  const lines = value.split(/\r?\n/);
  const segments: EvidenceSegment[] = [];
  let currentTiming: { start: number | null; end: number | null } | null = null;
  let currentText: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const timingMatch = line.match(
      /(?<start>\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s+-->\s+(?<end>\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/
    );

    if (timingMatch?.groups) {
      flushTranscriptSegment(segments, currentTiming, currentText);
      currentTiming = {
        start: parseTimestamp(timingMatch.groups.start),
        end: parseTimestamp(timingMatch.groups.end)
      };
      currentText = [];
      continue;
    }

    if (!line || /^WEBVTT$/i.test(line) || /^\d+$/.test(line)) {
      flushTranscriptSegment(segments, currentTiming, currentText);
      currentTiming = null;
      currentText = [];
      continue;
    }

    currentText.push(line);
  }

  flushTranscriptSegment(segments, currentTiming, currentText);

  if (segments.length > 0) {
    return segments;
  }

  return buildTextSegments(value, "recording_transcript");
}

function flushTranscriptSegment(
  segments: EvidenceSegment[],
  timing: { start: number | null; end: number | null } | null,
  lines: string[]
) {
  const text = compactText(lines.join(" "));

  if (!text) {
    return;
  }

  for (const sentence of splitSentences(text)) {
    segments.push({
      text: sentence,
      startSeconds: timing?.start ?? null,
      endSeconds: timing?.end ?? null,
      sourceType: "recording_transcript"
    });
  }
}

function buildFacts(args: {
  segments: EvidenceSegment[];
  item: NormalizedSourceItem;
  sourceType: MeetingSourceType;
  sourceLabel: string;
  recordingUrl: string | null;
  transcriptUrl: string | null;
}) {
  const facts: ExtractedMeetingFact[] = [];

  for (const segment of args.segments) {
    if (isLowSignalProcedure(segment.text)) {
      continue;
    }

    const projectName = inferProjectName(segment.text, args.item.title);

    if (DECISION_PATTERNS.test(segment.text)) {
      addFact(facts, {
        kind: "decision",
        label: "Decision or action",
        summary: summarizeFactSentence(segment.text),
        quote: quoteFromSegment(segment.text),
        sourceType: segment.sourceType,
        sourceUrl: sourceUrlForType(args, segment.sourceType),
        sourceLabel: sourceLabelForType(args, segment.sourceType),
        confidence: projectName ? 0.88 : 0.78,
        transcriptStartSeconds: segment.startSeconds,
        transcriptEndSeconds: segment.endSeconds,
        projectName
      });
      continue;
    }

    if (PROJECT_PATTERNS.test(segment.text)) {
      addFact(facts, {
        kind: "project_update",
        label: projectName ? `Project update: ${projectName}` : "Project update",
        summary: summarizeFactSentence(segment.text),
        quote: quoteFromSegment(segment.text),
        sourceType: segment.sourceType,
        sourceUrl: sourceUrlForType(args, segment.sourceType),
        sourceLabel: sourceLabelForType(args, segment.sourceType),
        confidence: projectName ? 0.84 : 0.72,
        transcriptStartSeconds: segment.startSeconds,
        transcriptEndSeconds: segment.endSeconds,
        projectName
      });
      continue;
    }

    if (PUBLIC_COMMENT_PATTERNS.test(segment.text)) {
      addFact(facts, {
        kind: "public_comment",
        label: "Public comment",
        summary: summarizeFactSentence(segment.text),
        quote: quoteFromSegment(segment.text),
        sourceType: segment.sourceType,
        sourceUrl: sourceUrlForType(args, segment.sourceType),
        sourceLabel: sourceLabelForType(args, segment.sourceType),
        confidence: 0.72,
        transcriptStartSeconds: segment.startSeconds,
        transcriptEndSeconds: segment.endSeconds,
        projectName
      });
      continue;
    }

    if (CONDITION_PATTERNS.test(segment.text)) {
      addFact(facts, {
        kind: "condition",
        label: "Condition or review item",
        summary: summarizeFactSentence(segment.text),
        quote: quoteFromSegment(segment.text),
        sourceType: segment.sourceType,
        sourceUrl: sourceUrlForType(args, segment.sourceType),
        sourceLabel: sourceLabelForType(args, segment.sourceType),
        confidence: 0.76,
        transcriptStartSeconds: segment.startSeconds,
        transcriptEndSeconds: segment.endSeconds,
        projectName
      });
      continue;
    }

    if (NEXT_STEP_PATTERNS.test(segment.text)) {
      addFact(facts, {
        kind: "next_step",
        label: "Next step",
        summary: summarizeFactSentence(segment.text),
        quote: quoteFromSegment(segment.text),
        sourceType: segment.sourceType,
        sourceUrl: sourceUrlForType(args, segment.sourceType),
        sourceLabel: sourceLabelForType(args, segment.sourceType),
        confidence: 0.7,
        transcriptStartSeconds: segment.startSeconds,
        transcriptEndSeconds: segment.endSeconds,
        projectName
      });
    }
  }

  if (args.recordingUrl || args.transcriptUrl) {
    addFact(facts, {
      kind: "recording_reference",
      label: "Recording source available",
      summary:
        "A recording or transcript source is linked for checking wording, timestamps, or details beyond the posted summary.",
      quote: null,
      sourceType: args.transcriptUrl ? "recording_transcript" : "recording",
      sourceUrl: args.transcriptUrl ?? args.recordingUrl ?? args.item.sourceUrl,
      sourceLabel: args.transcriptUrl ? "Transcript source" : "Recording source",
      confidence: 0.9,
      transcriptStartSeconds: null,
      transcriptEndSeconds: null,
      projectName: null
    });
  }

  return rankFacts(facts).slice(0, 12);
}

function buildProjectEvents(
  facts: ExtractedMeetingFact[],
  item: NormalizedSourceItem
): ExtractedProjectEvent[] {
  const projectEvents: ExtractedProjectEvent[] = [];
  const fallbackProjectName = inferProjectName(item.title, item.normalizedText);

  for (const fact of facts) {
    const projectName = fact.projectName ?? fallbackProjectName;

    if (!projectName || fact.kind === "public_comment" || fact.kind === "recording_reference") {
      continue;
    }

    projectEvents.push({
      projectName,
      eventKind:
        fact.kind === "decision"
          ? "decision"
          : fact.kind === "condition"
            ? "condition"
            : fact.kind === "next_step"
              ? "next_step"
              : "mentioned",
      summary: fact.summary,
      quote: fact.quote,
      sourceType: fact.sourceType,
      sourceUrl: fact.sourceUrl,
      confidence: fact.confidence
    });
  }

  return dedupeBy(
    projectEvents,
    (event) =>
      `${event.projectName.toLowerCase()}|${event.eventKind}|${event.summary.toLowerCase()}`
  ).slice(0, 8);
}

function buildSourceTrail(
  item: NormalizedSourceItem,
  sourceType: MeetingSourceType,
  recordingUrl: string | null,
  transcriptUrl: string | null
) {
  const trail: MeetingSourceTrailItem[] = [
    {
      label: inferSourceLabel(item, sourceType),
      url: item.sourceUrl,
      sourceType
    }
  ];

  if (item.sourcePageUrl && item.sourcePageUrl !== item.sourceUrl) {
    trail.push({
      label: "Archive or listing page",
      url: item.sourcePageUrl,
      sourceType: "source_text"
    });
  }

  if (recordingUrl) {
    trail.push({
      label: "Meeting recording",
      url: recordingUrl,
      sourceType: "recording"
    });
  }

  if (transcriptUrl) {
    trail.push({
      label: "Transcript or captions",
      url: transcriptUrl,
      sourceType: "recording_transcript"
    });
  }

  return dedupeBy(trail, (entry) => entry.url);
}

function splitSentences(value: string) {
  return compactText(value)
    .split(/(?<=[.!?])\s+|(?=\bMotion was made\b)|(?=\bPreliminary\b)|(?=\bFinal\b)|(?=\bPublic Comment\b)/)
    .map((sentence) => compactText(sentence))
    .filter((sentence) => sentence.length >= 24);
}

function isLowSignalProcedure(value: string) {
  return /call to order|roll call|pledge of allegiance|approval of (?:the )?minutes|approve the minutes|adjournment|members present|attendance/i.test(
    value
  );
}

function summarizeFactSentence(value: string) {
  const compact = compactText(value);

  if (compact.length <= 260) {
    return compact;
  }

  return `${compact.slice(0, 257).trimEnd()}...`;
}

function quoteFromSegment(value: string) {
  const compact = compactText(value);

  if (!compact) {
    return null;
  }

  if (compact.length <= 420) {
    return compact;
  }

  return `${compact.slice(0, 417).trimEnd()}...`;
}

function addFact(facts: ExtractedMeetingFact[], fact: ExtractedMeetingFact) {
  const key = `${fact.kind}|${compactText(fact.summary).toLowerCase()}`;

  if (
    facts.some(
      (existing) =>
        `${existing.kind}|${compactText(existing.summary).toLowerCase()}` === key
    )
  ) {
    return;
  }

  facts.push(fact);
}

function rankFacts(facts: ExtractedMeetingFact[]) {
  const priority: Record<MeetingFactKind, number> = {
    decision: 1,
    project_update: 2,
    condition: 3,
    next_step: 4,
    public_comment: 5,
    recording_reference: 6
  };

  return [...facts].sort((left, right) => {
    const priorityDifference = priority[left.kind] - priority[right.kind];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.confidence - left.confidence;
  });
}

function inferProjectName(text: string, title: string) {
  const candidates = [
    ...collectNamedPlanTargets(text),
    ...collectProjectNames(text),
    ...collectProjectNames(title),
    ...collectNamedPlanTargets(title)
  ];

  return candidates.find((candidate) => !isBadProjectName(candidate)) ?? null;
}

function collectProjectNames(value: string) {
  const names: string[] = [];
  const compact = compactText(value);
  const projectPattern =
    /\b[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'&/-]*){0,6}\s+(?:Subdivision|Development|Commons|Meadows|Square|Village|Plan|Project|Apartments|Townhomes|Estates)\b/g;

  for (const match of compact.matchAll(projectPattern)) {
    names.push(cleanProjectName(match[0]));
  }

  return names;
}

function collectNamedPlanTargets(value: string) {
  const names: string[] = [];
  const compact = compactText(value);
  const pattern =
    /(?:plan for|project known as|known as|for)\s+([A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){1,5})(?=,|\s+-|\s+located|\s+which|\s+was|\s+is|\.|$)/gi;

  for (const match of compact.matchAll(pattern)) {
    if (match[1]) {
      names.push(cleanProjectName(match[1]));
    }
  }

  return names;
}

function cleanProjectName(value: string) {
  return compactText(value)
    .replace(/\s+(?:Preliminary|Final|Subdivision|Land Development Plan)$/i, "")
    .replace(/\s+-.*$/, "")
    .trim();
}

function isBadProjectName(value: string) {
  return (
    value.length < 4 ||
    /^(?:preliminary|final)$/i.test(value) ||
    /planning commission|board of commissioners|zoning hearing|meeting minutes|preliminary subdivision|land development plan/i.test(
      value
    )
  );
}

function sourceUrlForType(
  args: {
    item: NormalizedSourceItem;
    recordingUrl: string | null;
    transcriptUrl: string | null;
  },
  sourceType: MeetingSourceType
) {
  if (sourceType === "recording_transcript") {
    return args.transcriptUrl ?? args.recordingUrl ?? args.item.sourceUrl;
  }

  if (sourceType === "recording") {
    return args.recordingUrl ?? args.item.sourceUrl;
  }

  return args.item.sourceUrl;
}

function sourceLabelForType(
  args: {
    sourceLabel: string;
    transcriptUrl: string | null;
    recordingUrl: string | null;
  },
  sourceType: MeetingSourceType
) {
  if (sourceType === "recording_transcript" && args.transcriptUrl) {
    return "Transcript source";
  }

  if (sourceType === "recording" && args.recordingUrl) {
    return "Recording source";
  }

  return args.sourceLabel;
}

function firstMetadataUrl(
  metadata: NormalizedSourceItem["metadata"],
  keys: string[]
) {
  for (const key of keys) {
    const value = metadata[key]?.trim();

    if (!value) {
      continue;
    }

    try {
      return new URL(value).toString();
    } catch {
      continue;
    }
  }

  return null;
}

function parseTimestamp(value: string) {
  const normalized = value.replace(",", ".");
  const pieces = normalized.split(":");
  const seconds = Number(pieces.pop() ?? "0");
  const minutes = Number(pieces.pop() ?? "0");
  const hours = Number(pieces.pop() ?? "0");

  if (![seconds, minutes, hours].every(Number.isFinite)) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const key = getKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
