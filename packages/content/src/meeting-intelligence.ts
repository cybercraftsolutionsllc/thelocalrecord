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

type SegmentRole =
  | "decision"
  | "project_update"
  | "public_comment"
  | "next_step"
  | "condition"
  | "vote"
  | "context"
  | "ignore";

type MeetingContextBlock = {
  projectName: string | null;
  context: EvidenceSegment[];
  decisions: EvidenceSegment[];
  votes: EvidenceSegment[];
  comments: EvidenceSegment[];
  conditions: EvidenceSegment[];
  nextSteps: EvidenceSegment[];
  evidence: EvidenceSegment[];
};

const DECISION_PATTERNS =
  /motion (?:was )?made|recommend approval|recommend tabling|table the plan|\bvoted\b|approved\s+(?:the|a|an)\b|\bdenied\b|\bgranted\b|\bcontinued\b/i;
const VOTE_PATTERNS =
  /motion carried|motion failed|\b\d+\s*-\s*\d+\b|abstentions?|unanimously/i;
const PROJECT_PATTERNS =
  /subdivision|land development|rezoning|variance|conditional use|waiver|stormwater|residential|dwelling|townhome|apartment|parcel|development plan|preliminary\/final|preliminary|final plan/i;
const PUBLIC_COMMENT_PATTERNS =
  /public comment|\bresidents?\b|\bneighbors?\b|commented|\bconcerns?\b|testified|asked|spoke in favor|spoke against/i;
const NEXT_STEP_PATTERNS =
  /next meeting|scheduled for|will be forwarded|board of commissioners|zoning hearing|public hearing|return to|continue[d]? to|staff review|engineer review/i;
const CONDITION_PATTERNS =
  /conditioned upon|condition|waiver|modification|subject to|contingent|pennDOT|stormwater|staff review letter|engineer review letter/i;
const CONTEXT_PATTERNS =
  /presented|proposes|proposed|site is located|located at|located on|applicant|developer|concept plan|minor modification|planned residential development/i;

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
    (segment) => segment.text.length >= 24 || VOTE_PATTERNS.test(segment.text)
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
  const surface = `${item.sourceSlug} ${item.title}`.toLowerCase();
  const haystack = `${surface} ${item.normalizedText}`.toLowerCase();
  const surfaceHasMeetingSignal =
    /\b(minutes?|agendas?|meeting|packet|recording|transcript)\b/.test(
      surface
    ) ||
    /\b(?:commission|board|hearing)\b.*\b(?:minutes?|agendas?|meeting|packet)\b/.test(
      surface
    );
  const bodyHasMeetingSignal =
    /\b(motion was made|motion carried|public comment|roll call|members present|call to order)\b/.test(
      haystack
    );

  if (classification === "approved_minutes" || classification === "agenda_posted") {
    return surfaceHasMeetingSignal || bodyHasMeetingSignal;
  }

  if (classification === "meeting_notice" || classification === "planning_zoning") {
    return surfaceHasMeetingSignal || bodyHasMeetingSignal;
  }

  return surfaceHasMeetingSignal || bodyHasMeetingSignal;
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
  const blocks = buildContextBlocks(args.segments, args.item);

  for (const block of blocks) {
    if (!isSubstantiveBlock(block)) {
      continue;
    }

    const decisionBrief = buildDecisionBrief(block, args.item);
    const primaryEvidence = firstBlockEvidence(block);

    if (decisionBrief && primaryEvidence) {
      addFact(facts, {
        kind: "decision",
        label: block.projectName
          ? `Decision: ${block.projectName}`
          : "Decision with context",
        summary: decisionBrief,
        quote: quoteFromBlock(block),
        sourceType: primaryEvidence.sourceType,
        sourceUrl: sourceUrlForType(args, primaryEvidence.sourceType),
        sourceLabel: sourceLabelForType(args, primaryEvidence.sourceType),
        confidence: block.projectName ? 0.92 : 0.82,
        transcriptStartSeconds: primaryEvidence.startSeconds,
        transcriptEndSeconds: primaryEvidence.endSeconds,
        projectName: block.projectName
      });
    }

    const projectBrief = buildProjectBrief(block);

    if (!decisionBrief && projectBrief && primaryEvidence) {
      addFact(facts, {
        kind: "project_update",
        label: block.projectName ? `Project: ${block.projectName}` : "Project update",
        summary: projectBrief,
        quote: quoteFromBlock(block),
        sourceType: primaryEvidence.sourceType,
        sourceUrl: sourceUrlForType(args, primaryEvidence.sourceType),
        sourceLabel: sourceLabelForType(args, primaryEvidence.sourceType),
        confidence: block.projectName ? 0.86 : 0.74,
        transcriptStartSeconds: primaryEvidence.startSeconds,
        transcriptEndSeconds: primaryEvidence.endSeconds,
        projectName: block.projectName
      });
    }

    const commentBrief = buildCommentBrief(block);
    const commentEvidence = block.comments[0];

    if (commentBrief && commentEvidence) {
      addFact(facts, {
        kind: "public_comment",
        label: block.projectName
          ? `Public comment: ${block.projectName}`
          : "Public comment",
        summary: commentBrief,
        quote: quoteFromSegment(commentEvidence.text),
        sourceType: commentEvidence.sourceType,
        sourceUrl: sourceUrlForType(args, commentEvidence.sourceType),
        sourceLabel: sourceLabelForType(args, commentEvidence.sourceType),
        confidence: block.projectName ? 0.78 : 0.7,
        transcriptStartSeconds: commentEvidence.startSeconds,
        transcriptEndSeconds: commentEvidence.endSeconds,
        projectName: block.projectName
      });
    }

    const nextStepBrief = buildNextStepBrief(block);
    const nextStepEvidence = block.nextSteps[0];

    if (!decisionBrief && nextStepBrief && nextStepEvidence) {
      addFact(facts, {
        kind: "next_step",
        label: block.projectName ? `Next step: ${block.projectName}` : "Next step",
        summary: nextStepBrief,
        quote: quoteFromSegment(nextStepEvidence.text),
        sourceType: nextStepEvidence.sourceType,
        sourceUrl: sourceUrlForType(args, nextStepEvidence.sourceType),
        sourceLabel: sourceLabelForType(args, nextStepEvidence.sourceType),
        confidence: 0.76,
        transcriptStartSeconds: nextStepEvidence.startSeconds,
        transcriptEndSeconds: nextStepEvidence.endSeconds,
        projectName: block.projectName
      });
    }

    const conditionBrief = buildConditionBrief(block);
    const conditionEvidence = block.conditions[0];

    if (!decisionBrief && conditionBrief && conditionEvidence) {
      addFact(facts, {
        kind: "condition",
        label: block.projectName
          ? `Condition: ${block.projectName}`
          : "Condition or review item",
        summary: conditionBrief,
        quote: quoteFromSegment(conditionEvidence.text),
        sourceType: conditionEvidence.sourceType,
        sourceUrl: sourceUrlForType(args, conditionEvidence.sourceType),
        sourceLabel: sourceLabelForType(args, conditionEvidence.sourceType),
        confidence: 0.74,
        transcriptStartSeconds: conditionEvidence.startSeconds,
        transcriptEndSeconds: conditionEvidence.endSeconds,
        projectName: block.projectName
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

function buildContextBlocks(
  segments: EvidenceSegment[],
  item: NormalizedSourceItem
) {
  const blocks: MeetingContextBlock[] = [];
  let activeBlock: MeetingContextBlock | null = null;

  for (const segment of segments) {
    const text = normalizeMeetingSentence(segment.text);

    if (!text) {
      continue;
    }

    if (isLowSignalProcedure(text) || isGenericMeetingHeading(text)) {
      activeBlock = null;
      continue;
    }

    const normalizedSegment = { ...segment, text };
    const role = classifySegment(text);

    if (role === "ignore") {
      continue;
    }

    if (role === "vote") {
      if (activeBlock) {
        appendToBlock(activeBlock, "votes", normalizedSegment);
      }
      continue;
    }

    const projectName = inferProjectName(text, item.title);
    let block: MeetingContextBlock | null = projectName
      ? findOrCreateBlock(blocks, projectName)
      : activeBlock;

    if (!block && roleRequiresStandaloneBlock(role)) {
      block = findOrCreateBlock(blocks, projectName);
    }

    if (!block) {
      continue;
    }

    if (!block.projectName && projectName) {
      block.projectName = projectName;
    }

    if (role === "decision" && isLowSignalProcedure(text)) {
      continue;
    }

    switch (role) {
      case "decision":
        appendToBlock(block, "decisions", normalizedSegment);
        break;
      case "project_update":
      case "context":
        appendToBlock(block, "context", normalizedSegment);
        break;
      case "public_comment":
        appendToBlock(block, "comments", normalizedSegment);
        break;
      case "condition":
        appendToBlock(block, "conditions", normalizedSegment);
        break;
      case "next_step":
        appendToBlock(block, "nextSteps", normalizedSegment);
        break;
      default:
        break;
    }

    activeBlock = block;
  }

  return blocks;
}

function classifySegment(text: string): SegmentRole {
  if (isStandaloneVoteSentence(text)) {
    return "vote";
  }

  if (DECISION_PATTERNS.test(text)) {
    return "decision";
  }

  if (PUBLIC_COMMENT_PATTERNS.test(text)) {
    return "public_comment";
  }

  if (PROJECT_PATTERNS.test(text)) {
    return "project_update";
  }

  if (CONTEXT_PATTERNS.test(text)) {
    return "context";
  }

  if (NEXT_STEP_PATTERNS.test(text)) {
    return "next_step";
  }

  if (CONDITION_PATTERNS.test(text)) {
    return "condition";
  }

  return "ignore";
}

function isStandaloneVoteSentence(value: string) {
  return (
    VOTE_PATTERNS.test(value) &&
    !/recommend approval|recommend tabling|table the plan|approved|denied|granted|continued/i.test(
      value
    )
  );
}

function roleRequiresStandaloneBlock(role: SegmentRole) {
  return role === "decision" || role === "project_update" || role === "context";
}

function findOrCreateBlock(
  blocks: MeetingContextBlock[],
  projectName: string | null
) {
  if (projectName) {
    const existing = blocks.find(
      (block) =>
        block.projectName?.toLowerCase() === projectName.toLowerCase()
    );

    if (existing) {
      return existing;
    }
  }

  const block: MeetingContextBlock = {
    projectName,
    context: [],
    decisions: [],
    votes: [],
    comments: [],
    conditions: [],
    nextSteps: [],
    evidence: []
  };

  blocks.push(block);
  return block;
}

function appendToBlock(
  block: MeetingContextBlock,
  key: "context" | "decisions" | "votes" | "comments" | "conditions" | "nextSteps",
  segment: EvidenceSegment
) {
  if (block[key].some((existing) => existing.text === segment.text)) {
    return;
  }

  block[key].push(segment);

  if (!block.evidence.some((existing) => existing.text === segment.text)) {
    block.evidence.push(segment);
  }
}

function isSubstantiveBlock(block: MeetingContextBlock) {
  if (block.projectName) {
    return true;
  }

  if (block.decisions.length === 0 && block.context.length === 0) {
    return false;
  }

  return block.evidence.some((segment) =>
    /presented|proposes|proposed|site is located|located at|located on/i.test(
      segment.text
    )
  );
}

function firstBlockEvidence(block: MeetingContextBlock) {
  return (
    block.context[0] ??
    block.decisions[0] ??
    block.comments[0] ??
    block.nextSteps[0] ??
    block.conditions[0] ??
    block.votes[0] ??
    null
  );
}

function buildDecisionBrief(
  block: MeetingContextBlock,
  item: NormalizedSourceItem
) {
  if (block.decisions.length === 0) {
    return null;
  }

  const action = buildActionSentence(block, item);

  if (!action) {
    return null;
  }

  const context = buildContextSentence(block);
  const watch = buildWatchSentence(block);
  const prefix =
    block.projectName && (!context || !containsText(context, block.projectName))
      ? `${block.projectName}: `
      : "";
  const pieces = [
    context ? `${prefix}${context}` : block.projectName ? `${block.projectName}:` : "",
    action,
    watch
  ].filter(Boolean);

  return summarizeBrief(pieces.join(" "));
}

function buildProjectBrief(block: MeetingContextBlock) {
  if (block.context.length === 0) {
    return null;
  }

  const context = buildContextSentence(block);
  const watch = buildWatchSentence(block);
  const prefix =
    block.projectName && context && !containsText(context, block.projectName)
      ? `${block.projectName}: `
      : "";
  const pieces = [`${prefix}${context}`, watch].filter(Boolean);

  return summarizeBrief(pieces.join(" "));
}

function buildCommentBrief(block: MeetingContextBlock) {
  const comment = block.comments[0];

  if (!comment) {
    return null;
  }

  const context = block.projectName
    ? `${block.projectName}: `
    : block.context[0]
      ? `${summarizeFactSentence(block.context[0].text)} `
      : "";

  return summarizeBrief(`${context}${summarizeFactSentence(comment.text)}`);
}

function buildNextStepBrief(block: MeetingContextBlock) {
  const nextStep = block.nextSteps[0];

  if (!nextStep) {
    return null;
  }

  const prefix = block.projectName ? `${block.projectName}: ` : "";

  return summarizeBrief(`${prefix}${summarizeFactSentence(nextStep.text)}`);
}

function buildConditionBrief(block: MeetingContextBlock) {
  const condition = block.conditions[0];

  if (!condition) {
    return null;
  }

  const prefix = block.projectName ? `${block.projectName}: ` : "";

  return summarizeBrief(`${prefix}${summarizeFactSentence(condition.text)}`);
}

function buildContextSentence(block: MeetingContextBlock) {
  const preferred =
    block.context.find((segment) =>
      /presented|proposes|proposed|concept plan|minor modification/i.test(
        segment.text
      )
    ) ??
    block.context.find((segment) => /site is located|located at|located on/i.test(segment.text)) ??
    block.context[0];

  if (!preferred) {
    return null;
  }

  return summarizeFactSentence(preferred.text);
}

function buildActionSentence(
  block: MeetingContextBlock,
  item: NormalizedSourceItem
) {
  const decision = block.decisions[0];

  if (!decision) {
    return null;
  }

  if (isLowSignalProcedure(decision.text)) {
    return null;
  }

  const body = inferMeetingBody(item);
  const actor =
    body === "Municipal meeting" ? "The meeting record" : `The ${body}`;
  const vote = block.votes[0] ? normalizeVoteSentence(block.votes[0].text) : "";
  const action = extractMotionAction(decision.text);

  if (!action) {
    return null;
  }

  const acted =
    vote && /carried/i.test(vote)
      ? `${formatActionForActor(actor, action)} ${vote}`
      : `${actor} had a motion to ${action}.`;

  return acted;
}

function formatActionForActor(actor: string, action: string) {
  if (/^recommend approval/i.test(action)) {
    return `${actor} recommended approval${action.replace(/^recommend approval/i, "")}.`;
  }

  if (/^recommend tabling/i.test(action)) {
    return `${actor} recommended tabling${action.replace(/^recommend tabling/i, "")}.`;
  }

  if (/^table the plan/i.test(action)) {
    return `${actor} tabled the plan${action.replace(/^table the plan/i, "")}.`;
  }

  if (/^approve/i.test(action)) {
    return `${actor} approved${action.replace(/^approve/i, "")}.`;
  }

  if (/^deny/i.test(action)) {
    return `${actor} denied${action.replace(/^deny/i, "")}.`;
  }

  if (/^continue/i.test(action)) {
    return `${actor} continued${action.replace(/^continue/i, "")}.`;
  }

  return `${actor} acted to ${action}.`;
}

function extractMotionAction(value: string) {
  const compact = compactText(value);
  const actionMatch = compact.match(/\bto\s+(.+?)(?:\.|$)/i);
  let action = actionMatch?.[1] ? compactText(actionMatch[1]) : "";

  if (!action) {
    if (/recommend approval/i.test(compact)) {
      action = "recommend approval";
    } else if (/table the plan/i.test(compact)) {
      action = "table the plan";
    } else if (/recommend tabling/i.test(compact)) {
      action = "recommend tabling";
    } else if (/approved/i.test(compact)) {
      action = "approve the item";
    } else if (/denied/i.test(compact)) {
      action = "deny the item";
    } else if (/continued/i.test(compact)) {
      action = "continue the item";
    }
  }

  if (!action || /approve the minutes|approval of minutes/i.test(action)) {
    return null;
  }

  return action
    .replace(/\s+Motion carried.*$/i, "")
    .replace(/\s+Public comment.*$/i, "")
    .replace(/\s+The plan will return.*$/i, "")
    .trim();
}

function normalizeVoteSentence(value: string) {
  const compact = summarizeFactSentence(value);

  if (/^motion/i.test(compact)) {
    return compact;
  }

  return `Motion ${compact.charAt(0).toLowerCase()}${compact.slice(1)}`;
}

function buildWatchSentence(block: MeetingContextBlock) {
  const combined = block.evidence.map((segment) => segment.text).join(" ");

  if (/board of commissioners|will be forwarded/i.test(combined)) {
    return "Watch next: Board of Commissioners action or a posted follow-up record.";
  }

  if (/return after|will return|return to|next meeting|continued to/i.test(combined)) {
    return "Watch next: the item is expected to return in a future meeting record.";
  }

  if (/township engineer and staff review letters/i.test(combined)) {
    return "Watch next: Township Engineer and staff review-letter conditions.";
  }

  if (/staff review letter|engineer review letter|staff review|engineer review/i.test(combined)) {
    return "Watch next: staff or engineer review items tied to this record.";
  }

  if (/public hearing|zoning hearing/i.test(combined)) {
    return "Watch next: public hearing notices, testimony, or follow-up action.";
  }

  return null;
}

function quoteFromBlock(block: MeetingContextBlock) {
  const text = compactText(
    [
      ...block.context.slice(0, 2),
      ...block.decisions.slice(0, 1),
      ...block.votes.slice(0, 1),
      ...block.nextSteps.slice(0, 1),
      ...block.conditions.slice(0, 1)
    ]
      .map((segment) => segment.text)
      .join(" ")
  );

  return quoteFromSegment(text);
}

function normalizeMeetingSentence(value: string) {
  const normalized = compactText(value)
    .replace(/^[,;:\-\s]+/, "")
    .replace(/^of\s+([A-Z])/u, "$1")
    .replace(
      /^\d{1,2}\s+[A-Za-z]+\s+\d{4}\s+-\s+[^.]{0,90}\s+/,
      ""
    )
    .replace(/^Meeting Minutes for the [^.]{0,90}\s+/i, "")
    .trim();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function summarizeBrief(value: string) {
  const compact = compactText(value);

  if (compact.length <= 620) {
    return compact;
  }

  return `${compact.slice(0, 617).trimEnd()}...`;
}

function containsText(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
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
    .filter((sentence) => sentence.length >= 24 || VOTE_PATTERNS.test(sentence));
}

function isLowSignalProcedure(value: string) {
  return /call to order|roll call|pledge of allegiance|approval of (?:the )?minutes|approve the minutes|adjourn(?:ed|ment| the meeting)?|members present|attendance|zoom link|meeting calendar|located on the home page|join (?:the )?meeting|virtual meeting|public comment\s*[-–:]?\s*none\b/i.test(
    value
  );
}

function isGenericMeetingHeading(value: string) {
  return /^(?:subdivision (?:and|&) land development plans?|conditional use applications?|public comment|new business|old business|other business|briefing|action)\b(?:\s+[A-Z]\.)?$/i.test(
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
    /\b[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'&/-]*){0,6}\s+(?:Subdivision|Development|Commons|Meadows|Square|Shopping Center|Center|Village|Plan|Project|Apartments|Townhomes|Estates)\b/g;

  for (const match of compact.matchAll(projectPattern)) {
    names.push(cleanProjectName(match[0]));
  }

  return names;
}

function collectNamedPlanTargets(value: string) {
  const names: string[] = [];
  const compact = compactText(value);
  const pattern =
    /(?:[Pp]lan for|[Pp]roject known as|[Kk]nown as|[Ww]ithin|[Ll]ocated at|[Ff]or)\s+(?:the\s+)?([A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'&/-]*){1,6})(?=,|\s+-|\s+located|\s+which|\s+was|\s+is|\s+plan|\s+project|\.|$)/g;
  const ofPlanPattern =
    /\b[Oo]f\s+(?:the\s+)?([A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'&/-]*){1,6})\s+(?:plan|project|subdivision|development)\b/g;

  for (const match of compact.matchAll(pattern)) {
    if (match[1]) {
      names.push(cleanProjectName(match[1]));
    }
  }

  for (const match of compact.matchAll(ofPlanPattern)) {
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
    .replace(/[.,;:]+$/, "")
    .trim();
}

function isBadProjectName(value: string) {
  return (
    value.length < 4 ||
    !/^[A-Z0-9]/.test(value) ||
    /^(?:preliminary|final)$/i.test(value) ||
    /planning commission|board of commissioners|zoning hearing|meeting minutes|preliminary subdivision|land development plan|planned residential development|concept plan|approved planned|the plan|the land|purpose of|revisions to|township dedication|penndot permitting|review letters|satisfaction of/i.test(
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
