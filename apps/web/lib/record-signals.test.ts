import { describe, expect, it } from "vitest";

import type { PublicEntry } from "./data";
import {
  buildRecordSignal,
  getDateToKnow,
  getResidentLane
} from "./record-signals";

function entry(overrides: Partial<PublicEntry>): PublicEntry {
  return {
    id: "entry-1",
    title: "Test entry",
    summary: "Test summary",
    category: "official_news",
    publishedAt: "2026-06-01T00:00:00.000Z",
    sourceMaterialDate: "2026-06-01T00:00:00.000Z",
    sourceLabel: "Township News",
    sourceLinks: [],
    impactLevel: "routine",
    ...overrides
  };
}

describe("record signals", () => {
  it("classifies road and closure records as roads", () => {
    expect(
      getResidentLane(
        entry({
          title: "Upcoming Butter Road Bridge Repair Project",
          summary:
            "Butter Road will be closed to through traffic between Landis Valley Road and Hunsicker Road."
        })
      )
    ).toBe("roads");
  });

  it("classifies ordinance vote records as hearings", () => {
    expect(
      getResidentLane(
        entry({
          title: "Proposed Ordinance 2026-11",
          summary:
            "The Board of Commissioners will consider and vote at a public meeting on Monday, July 13, 2026 at 6:00 p.m."
        })
      )
    ).toBe("hearings");
  });

  it("prioritizes debt, audit, and budget records as money even when an ordinance is involved", () => {
    expect(
      getResidentLane(
        entry({
          title:
            "Legal Notice - Proposed Ordinance 2026-12 Increasing the Indebtedness of the Township",
          summary:
            "The Board proposes issuing a general obligation note of up to $3,500,000 to pay for capital improvements."
        })
      )
    ).toBe("money");
  });

  it("extracts the next future date residents should know", () => {
    const date = getDateToKnow(
      entry({
        summary:
          "Line painting runs from Monday, June 29 through Thursday, July 2."
      }),
      new Date("2026-06-30T12:00:00.000Z")
    );

    expect(date).toBe("Thursday, July 2");
  });

  it("builds a resident signal with source date, action, and why text", () => {
    const signal = buildRecordSignal(
      entry({
        impactLevel: "important",
        title: "Legal Notice - Proposed Ordinance 2026-12",
        summary:
          "The Board intends to consider enactment on Monday, June 22, 2026 at 6:00 p.m."
      }),
      new Date("2026-06-01T00:00:00.000Z")
    );

    expect(signal.lane).toBe("hearings");
    expect(signal.importanceLabel).toBe("Important");
    expect(signal.action).toContain("public meeting");
    expect(signal.why).toContain("public decision");
  });
});
