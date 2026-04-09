import type {
  ContentDecision,
  NormalizedSourceItem
} from "@thelocalrecord/core";

import type { WorkerEnv } from "./env";
import type { SearchablePublishedEntry } from "./d1";

type OpenAIStructuredDecision = Pick<
  ContentDecision,
  "summary" | "extractionNote"
> & {
  rationale?: string[];
};

type AskLocalityStructuredAnswer = {
  answer: string;
  citationIndexes: number[];
};

const SUMMARY_REFINEMENT_PROMPT = `You assist an independent local-government digest.

Use only the supplied source text.
Write 2 to 4 concise sentences in plain language.
Explain what changed, what it means for residents, and any dates, deadlines, closures, meetings, or actions explicitly stated in the source.
Avoid repeating the title word-for-word.
Do not imply approval, outcomes, enforcement, or legal effect unless the source explicitly says so.
Do not change risk gating or classification.
If the extracted text is partial, uncertain, or repetitive, keep the summary conservative and factual.`;

const LOCALITY_ANSWER_SYSTEM_PROMPT = `You answer questions about one locality digest using only the supplied evidence from published municipal-source entries.

Hard rules:
- Use only the provided evidence. Never rely on outside knowledge or model memory.
- If the evidence does not clearly answer the question, say so plainly.
- Do not invent requirements, deadlines, approvals, exceptions, enforcement actions, or legal conclusions.
- Do not say "yes" or "no" to permit, zoning, ordinance, compliance, or legal questions unless the evidence explicitly supports that conclusion.
- For permit, legal, zoning, or ordinance questions with incomplete support, say that the currently indexed sources do not conclusively answer the question and direct the reader to the cited official source.
- If multiple interpretations are possible, prefer a cautious answer over a confident one.
- Do not mention any source that is not in the evidence list.

Style:
- Answer in 2 to 4 concise sentences.
- Be helpful, plainspoken, and specific.
- If the question is broad, answer the part supported by the evidence and note any important uncertainty.

Citations:
- Return citationIndexes for the strongest supporting evidence only.
- Cite at least one item when answering, unless the evidence truly provides no support.
- Prefer the most directly relevant official source entries.

Your job is to help residents understand what the current cited material says, not to replace the official source.`;

export type AskLocalityResult =
  | {
      mode: "clarify";
      clarifyQuestion: string;
      disclaimer: string;
    }
  | {
      mode: "answer";
      answer: string;
      citations: Array<{
        title: string;
        url: string;
        label: string;
        sourceName: string;
      }>;
      disclaimer: string;
    };

export async function maybeRefineSummaryWithOpenAI(
  env: WorkerEnv,
  item: NormalizedSourceItem,
  baseDecision: ContentDecision
): Promise<ContentDecision> {
  if (!env.OPENAI_API_KEY) {
    return baseDecision;
  }

  if (!["township-news", "alert-center"].includes(item.sourceSlug)) {
    return baseDecision;
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
        instructions: SUMMARY_REFINEMENT_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  title: item.title,
                  sourceSlug: item.sourceSlug,
                  normalizedText: item.normalizedText,
                  extraction: item.extraction,
                  baseDecision
                })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "content_refinement",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: {
                  type: "string"
                },
                extractionNote: {
                  type: ["string", "null"]
                },
                rationale: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                }
              },
              required: ["summary", "extractionNote", "rationale"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      return baseDecision;
    }

    const payload = (await response.json()) as {
      output?: Array<{
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }>;
    };

    const text = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.text)?.text;

    if (!text) {
      return baseDecision;
    }

    const parsed = JSON.parse(text) as OpenAIStructuredDecision;

    return {
      ...baseDecision,
      summary: normalizeSummary(parsed.summary ?? baseDecision.summary),
      extractionNote:
        parsed.extractionNote === null
          ? undefined
          : (parsed.extractionNote ?? baseDecision.extractionNote),
      rationale: parsed.rationale?.length
        ? parsed.rationale
        : baseDecision.rationale
    };
  } catch {
    return baseDecision;
  }
}

function normalizeSummary(summary: string) {
  const compact = summary.replace(/\s+/g, " ").trim();

  if (compact.length <= 650) {
    return compact;
  }

  return `${compact.slice(0, 647).trimEnd()}...`;
}

function normalizeAnswer(answer: string) {
  const compact = answer.replace(/\s+/g, " ").trim();

  if (compact.length <= 950) {
    return compact;
  }

  return `${compact.slice(0, 947).trimEnd()}...`;
}

function defaultAskDisclaimer() {
  return "AI-assisted answer for convenience only. It is not legal advice or an official notice. Check the cited source links for the official record.";
}

function needsClarification(question: string) {
  const normalized = question.trim().toLowerCase();
  const tokenCount = normalized.split(/\s+/).filter(Boolean).length;

  if (normalized.length < 12) {
    return "What topic do you want to ask about? Try a meeting, road closure, ordinance, planning item, or a specific notice.";
  }

  const genericPatterns = [
    "what's happening",
    "whats happening",
    "what is happening",
    "what's new",
    "whats new",
    "updates",
    "anything new",
    "tell me more"
  ];

  if (genericPatterns.some((pattern) => normalized === pattern)) {
    return "Can you narrow that down to a topic like meetings, planning, roads, alerts, or a specific post title?";
  }

  if (
    tokenCount <= 4 &&
    genericPatterns.some((pattern) => normalized.startsWith(`${pattern} `))
  ) {
    return "Can you narrow that down to a topic like meetings, planning, roads, alerts, or a specific post title?";
  }

  return null;
}

function relabelCitationLink(label: string, url: string, index: number) {
  const lowerLabel = label.toLowerCase();
  const isPdf = url.toLowerCase().endsWith(".pdf");

  if (lowerLabel.includes("source page")) {
    return "Listing page";
  }

  if (lowerLabel.includes("source item")) {
    return isPdf ? "Original document" : "Original post";
  }

  if (index === 0) {
    return isPdf ? "Original document" : "Original post";
  }

  return label;
}

function parseCitationLinks(entries: SearchablePublishedEntry[]) {
  return entries.map((entry) => {
    const parsedLinks = safeParseLinks(entry.source_links_json);
    const preferredLink =
      parsedLinks.map((link, index) => ({
        ...link,
        label: relabelCitationLink(link.label, link.url, index)
      }))[0] ??
      ({
        label: "Source",
        url: "#"
      } satisfies { label: string; url: string });

    return {
      title: entry.title,
      sourceName: entry.source_name,
      label: preferredLink.label,
      url: preferredLink.url
    };
  });
}

function safeParseLinks(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [] as Array<{ label: string; url: string }>;
    }

    return parsed.filter((item): item is { label: string; url: string } => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.label === "string" && typeof candidate.url === "string"
      );
    });
  } catch {
    return [] as Array<{ label: string; url: string }>;
  }
}

export async function answerLocalityQuestion(
  env: WorkerEnv,
  args: {
    question: string;
    municipalityName: string;
    matches: SearchablePublishedEntry[];
  }
): Promise<AskLocalityResult> {
  const clarifyQuestion = needsClarification(args.question);

  if (clarifyQuestion) {
    return {
      mode: "clarify",
      clarifyQuestion,
      disclaimer: defaultAskDisclaimer()
    };
  }

  if (args.matches.length === 0) {
    return {
      mode: "clarify",
      clarifyQuestion:
        "I could not match that to the current published entries. Try a more specific term like a meeting name, ordinance, alert, or department topic.",
      disclaimer: defaultAskDisclaimer()
    };
  }

  const citations = parseCitationLinks(args.matches);

  if (!env.OPENAI_API_KEY) {
    return {
      mode: "answer",
      answer: buildFallbackAnswer(args.question, args.matches),
      citations: citations.slice(0, 3),
      disclaimer: defaultAskDisclaimer()
    };
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
        instructions: LOCALITY_ANSWER_SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  municipalityName: args.municipalityName,
                  question: args.question,
                  evidence: args.matches.map((match, index) => ({
                    index,
                    title: match.title,
                    summary: match.summary,
                    category: match.category,
                    sourceName: match.source_name,
                    sourceMaterialDate: match.source_material_date,
                    publishedAt: match.published_at,
                    sourceLinks: safeParseLinks(match.source_links_json)
                  }))
                })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "locality_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: {
                  type: "string"
                },
                citationIndexes: {
                  type: "array",
                  items: {
                    type: "integer"
                  }
                }
              },
              required: ["answer", "citationIndexes"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error("OpenAI request failed");
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
      throw new Error("Missing model output");
    }

    const parsed = JSON.parse(text) as AskLocalityStructuredAnswer;
    const citedIndexes = Array.from(
      new Set(
        (parsed.citationIndexes ?? []).filter(
          (index) =>
            Number.isInteger(index) && index >= 0 && index < citations.length
        )
      )
    );

    return {
      mode: "answer",
      answer: normalizeAnswer(parsed.answer),
      citations: (citedIndexes.length ? citedIndexes : [0]).map(
        (index) => citations[index]
      ),
      disclaimer: defaultAskDisclaimer()
    };
  } catch {
    return {
      mode: "answer",
      answer: buildFallbackAnswer(args.question, args.matches),
      citations: citations.slice(0, 3),
      disclaimer: defaultAskDisclaimer()
    };
  }
}

function buildFallbackAnswer(
  question: string,
  matches: SearchablePublishedEntry[]
) {
  const leadingMatches = matches.slice(0, 3);
  const joined = leadingMatches
    .map((match) => `${match.title}: ${match.summary}`)
    .join(" ");

  if (joined) {
    return normalizeAnswer(
      `Based on the current published entries related to "${question}", ${joined}`
    );
  }

  return "I could not build a grounded answer from the current published entries.";
}
