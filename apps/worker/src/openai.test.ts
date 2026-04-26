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
  impact_level: "routine",
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

const ashfordMeadowsMatch = {
  id: "entry-2",
  title: "15 October 2025 - Planning Commission Minutes",
  summary:
    "According to the posted meeting minutes, the planning commission discussed Ashford Meadows and recorded a recommendation on the plan.",
  category: "approved_minutes",
  impact_level: "important",
  source_links_json: JSON.stringify([
    {
      label: "Original document",
      url: "https://www.manheimtownship.org/Archive.aspx?ADID=3535"
    }
  ]),
  published_at: "2026-04-10T12:00:00.000Z",
  source_material_date: "2025-10-15T23:59:00.000Z",
  source_name: "Planning Commission Minutes Archive",
  normalized_text:
    "15 October 2025 - Planning Commission Minutes Ashford Meadows - 2325 Lititz Pike, Lancaster, PA 17601 and 120 Kreider Ave., Lancaster, PA 17601, R-2 Residential Zoning District. Todd Kurl of RGS Associates presented the plan which proposes the subdivision and lot add-on of property to prepare land for Township dedication and PennDOT permitting, and proposed conversion of 5 existing parcels to 9 parcels for future Ashford Meadows development. Motion was made to recommend approval of the plan and modifications conditioned upon Township Engineer and staff review letters."
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

  it("uses minute excerpts for development questions when no model key is present", async () => {
    const result = await answerLocalityQuestion(baseEnv, {
      question: "What do the current records say about Ashford Meadows?",
      municipalityName: "Manheim Township, PA",
      matches: [ashfordMeadowsMatch]
    });

    expect(result.mode).toBe("answer");

    if (result.mode === "answer") {
      expect(result.answer).toContain("Ashford Meadows");
      expect(result.answer).toContain("subdivision");
    }
  });
});
