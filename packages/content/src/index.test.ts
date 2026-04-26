import { describe, expect, it } from "vitest";

import { hashContent, normalizedSourceItemSchema } from "@thelocalrecord/core";

import { evaluateItem, extractEntryEntities } from "./index";

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
    expect(decision.impactLevel).toBe("important");
  });

  it("auto-publishes official planning items even with low extraction confidence", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "agenda-center",
      externalId: "agenda-2",
      title: "Planning Commission Packet",
      sourceUrl: "https://www.manheimtownship.org/planning.pdf",
      sourcePageUrl: "https://www.manheimtownship.org/AgendaCenter",
      normalizedText:
        "Rezoning hearing for a land development subdivision application",
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
    expect(decision.impactLevel).toBe("important");
  });

  it("routes unofficial low-confidence planning items to review", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "agenda-center",
      externalId: "agenda-3",
      title: "Planning Commission Packet",
      sourceUrl: "https://example.com/planning.pdf",
      sourcePageUrl: "https://example.com/agenda",
      normalizedText:
        "Rezoning hearing for a land development subdivision application",
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
      sourcePageUrl:
        "https://www.manheimtownship.org/1546/Planning-Zoning-FAQs",
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
    expect(decision.summary).toContain(
      "According to the posted meeting minutes"
    );
    expect(decision.summary).toContain("Ashford Meadows");
  });

  it("prefers substantive project discussion over procedural minute language", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-minutes",
      externalId: "pc-minutes-2",
      title: "18 February 2026 - Planning Commission Minutes",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3640",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      normalizedText:
        "18 February 2026 - Planning Commission Minutes Meeting Minutes for the 2/18/2026 Planning Commission Meeting Motion was made by Sandy Kime and seconded by Nathan Van Name to approve the minutes of the January 21, 2026, meeting. Motion carried 3-0 with 3 abstentions. Preliminary Subdivision & Land Development Plan for Ashford Meadows - R-2 Residential Zoning District. Todd Kurl of RGS Associates Inc. presented the plan which proposes 117 lots, with 111 lots being single family residential, and 6 being open space lots. The site is located at 120 Kreider Avenue, Lancaster, PA 17601 & 2325 Lititz Pike, Lancaster, PA 17601. Motion was made by Sandy Kime and seconded by Nathan van Name to table the plan. Motion carried 6-0.",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-minutes-2")
    });

    const decision = evaluateItem(item);

    expect(decision.summary).toContain("Ashford Meadows");
    expect(decision.summary).toContain("117 lots");
    expect(decision.summary).not.toContain("approve the minutes");
  });

  it("marks sourced road closures as critical source observations", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "alert-center",
      externalId: "alert-1",
      title: "Route 30 lane closure and detour",
      sourceUrl: "https://www.manheimtownship.org/AlertCenter.aspx",
      sourcePageUrl: "https://www.manheimtownship.org/AlertCenter.aspx",
      normalizedText:
        "The township alert center reports a road closure and detour near Lititz Pike.",
      extraction: {
        method: "html",
        confidence: 0.98
      },
      metadata: {},
      contentHash: hashContent("alert-1")
    });

    const decision = evaluateItem(item);

    expect(decision.classification).toBe("official_alert");
    expect(decision.impactLevel).toBe("critical_source");
  });

  it("extracts resident-facing entities from local records", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-minutes",
      externalId: "pc-minutes-geo",
      title: "Ashford Meadows Preliminary Subdivision",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3640",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      normalizedText:
        "The site is located at 120 Kreider Avenue and 2325 Lititz Pike. Route 30 traffic and Overlook Park access were discussed.",
      eventDate: "2026-02-18T00:00:00.000Z",
      extraction: {
        method: "pdf",
        confidence: 0.91
      },
      metadata: {},
      contentHash: hashContent("pc-minutes-geo")
    });

    const entities = extractEntryEntities(item);

    expect(entities.some((entity) => entity.entityKind === "address")).toBe(
      true
    );
    expect(entities.some((entity) => entity.entityKind === "route")).toBe(true);
    expect(
      entities.some((entity) => entity.entityKind === "meeting_date")
    ).toBe(true);
  });
});
