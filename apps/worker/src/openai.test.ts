import { describe, expect, it } from "vitest";

import type { WorkerEnv } from "./env";
import { answerLocalityQuestion } from "./openai";

const baseEnv = {
  DB: {} as WorkerEnv["DB"],
  ARTIFACTS: {} as WorkerEnv["ARTIFACTS"]
} satisfies WorkerEnv;

const troutSeasonMatch = {
  id: "entry-1",
  title: "Opening Day of Trout Season is This Saturday, April 4, 2026",
  summary:
    "The township news post says trout season opens on Saturday, April 4, 2026 and points residents to the season announcement.",
  category: "official_news",
  source_links_json: JSON.stringify([
    {
      label: "Original post",
      url: "https://www.manheimtownship.org/example/trout-season"
    }
  ]),
  published_at: "2026-04-01T12:00:00.000Z",
  source_material_date: "2026-04-01T12:00:00.000Z",
  source_name: "Township News and Information",
  normalized_text:
    "Opening day of trout season is this Saturday, April 4, 2026. The township shared season information for residents."
};

describe("answerLocalityQuestion", () => {
  it("answers specific whats-new questions instead of forcing clarification", async () => {
    const result = await answerLocalityQuestion(baseEnv, {
      question: "What's new this trout season versus last year?",
      municipalityName: "Manheim Township, PA",
      matches: [troutSeasonMatch]
    });

    expect(result.mode).toBe("answer");
  });

  it("still asks for clarification on truly generic questions", async () => {
    const result = await answerLocalityQuestion(baseEnv, {
      question: "What's new?",
      municipalityName: "Manheim Township, PA",
      matches: [troutSeasonMatch]
    });

    expect(result.mode).toBe("clarify");
  });
});
