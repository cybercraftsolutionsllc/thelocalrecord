import type { ContentDecision, NormalizedSourceItem } from "@thelocalrecord/core";

import type { WorkerEnv } from "./env";

type OpenAIStructuredDecision = Pick<
  ContentDecision,
  "summary" | "extractionNote"
> & {
  rationale?: string[];
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
        instructions:
          "You are assisting a local-government digest. Write 2 to 4 concise sentences that explain the update in plain language using only facts supported by the source. Explain what changed, what it means for residents, and any dates, deadlines, closures, meetings, or actions explicitly stated in the source. Avoid repeating the title word-for-word. Never imply approval or outcomes not explicitly supported by the source. Do not change risk gating.",
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

    const text = payload.output?.flatMap((item) => item.content ?? []).find((content) => content.text)?.text;

    if (!text) {
      return baseDecision;
    }

    const parsed = JSON.parse(text) as OpenAIStructuredDecision;

    return {
      ...baseDecision,
      summary: normalizeSummary(parsed.summary ?? baseDecision.summary),
      extractionNote:
        parsed.extractionNote === null ? undefined : parsed.extractionNote ?? baseDecision.extractionNote,
      rationale: parsed.rationale?.length ? parsed.rationale : baseDecision.rationale
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
