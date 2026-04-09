import { describe, expect, it } from "vitest";

import { hashContent, normalizedSourceItemSchema } from "@thelocalrecord/core";

import { evaluateItem } from "./index";

describe("evaluateItem", () => {
  it("auto-publishes low-risk agenda items", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "agenda-center",
      externalId: "agenda-1",
      title: "Board of Commissioners Agenda - April 9, 2026",
      sourceUrl: "https://example.com/agenda.pdf",
      sourcePageUrl: "https://example.com/agenda",
      normalizedText: "Board of Commissioners meeting agenda",
      extraction: {
        method: "html",
        confidence: 0.96
      },
      metadata: {},
      contentHash: hashContent("agenda-1")
    });

    const decision = evaluateItem(item);

    expect(decision.autoPublishAllowed).toBe(true);
    expect(decision.reviewState).toBe("auto_published");
    expect(decision.classification).toBe("agenda_posted");
  });

  it("auto-publishes official planning items even with low extraction confidence", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "agenda-center",
      externalId: "agenda-2",
      title: "Planning Commission Packet",
      sourceUrl: "https://www.manheimtownship.org/planning.pdf",
      sourcePageUrl: "https://www.manheimtownship.org/AgendaCenter",
      normalizedText: "Rezoning hearing for a land development subdivision application",
      extraction: {
        method: "pdf",
        confidence: 0.65,
        note: "PDF extraction was partial."
      },
      metadata: {},
      contentHash: hashContent("agenda-2")
    });

    const decision = evaluateItem(item);

    expect(decision.autoPublishAllowed).toBe(true);
    expect(decision.reviewState).toBe("auto_published");
    expect(decision.classification).toBe("planning_zoning");
  });

  it("routes unofficial low-confidence planning items to review", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "agenda-center",
      externalId: "agenda-3",
      title: "Planning Commission Packet",
      sourceUrl: "https://example.com/planning.pdf",
      sourcePageUrl: "https://example.com/agenda",
      normalizedText: "Rezoning hearing for a land development subdivision application",
      extraction: {
        method: "pdf",
        confidence: 0.65,
        note: "PDF extraction was partial."
      },
      metadata: {},
      contentHash: hashContent("agenda-3")
    });

    const decision = evaluateItem(item, { officialSource: false });

    expect(decision.autoPublishAllowed).toBe(false);
    expect(decision.reviewState).toBe("review_required");
    expect(decision.rationale).toContain("Low extraction confidence");
  });
});
