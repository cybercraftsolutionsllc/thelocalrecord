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

  it("classifies official planning FAQ content as planning_zoning and auto-publishes it", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-zoning-faq",
      externalId: "faq-1",
      title: "Can I keep chickens on my property?",
      sourceUrl: "https://www.manheimtownship.org/1546/Planning-Zoning-FAQs",
      sourcePageUrl: "https://www.manheimtownship.org/1546/Planning-Zoning-FAQs",
      normalizedText:
        "Can I keep chickens on my property? The township zoning FAQ explains how this use is regulated and when zoning approval may be required.",
      extraction: {
        method: "html",
        confidence: 0.98
      },
      metadata: {},
      contentHash: hashContent("faq-1")
    });

    const decision = evaluateItem(item);

    expect(decision.classification).toBe("planning_zoning");
    expect(decision.autoPublishAllowed).toBe(true);
    expect(decision.reviewState).toBe("auto_published");
  });

  it("uses extracted minute detail in the summary when meeting minutes include project discussion", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-minutes",
      externalId: "pc-minutes-1",
      title: "15 October 2025 - Planning Commission Minutes",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3535",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      normalizedText:
        "15 October 2025 - Planning Commission Minutes Ashford Meadows – 2325 Lititz Pike, Lancaster, PA 17601 & 120 Kreider Ave., Lancaster, PA 17601, R-2 Residential Zoning District. Todd Kurl of RGS Associates presented the plan which proposes the subdivision and lot add-on of property to prepare land for Township dedication and PennDOT permitting, and proposed conversion of 5 existing parcels to 9 parcels for future Ashford Meadows development. Motion was made by Alex Rohrbaugh and seconded by Sandy Kime to recommend approval of the plan and modifications conditioned upon satisfaction of Township Engineer and staff review letters.",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-minutes-1")
    });

    const decision = evaluateItem(item);

    expect(decision.classification).toBe("approved_minutes");
    expect(decision.summary).toContain("According to the posted meeting minutes");
    expect(decision.summary).toContain("Ashford Meadows");
  });
});
