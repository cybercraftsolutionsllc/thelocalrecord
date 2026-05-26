import { describe, expect, it } from "vitest";

import { hashContent, normalizedSourceItemSchema } from "@thelocalrecord/core";

import {
  evaluateItem,
  extractEntryEntities,
  extractMeetingIntelligence
} from "./index";

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

  it("extracts structured meeting intelligence from substantive minutes", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-minutes",
      externalId: "pc-minutes-intel",
      title: "18 February 2026 - Planning Commission Minutes",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3640",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      normalizedText:
        "Preliminary Subdivision & Land Development Plan for Ashford Meadows - R-2 Residential Zoning District. Todd Kurl of RGS Associates Inc. presented the plan which proposes 117 lots, with 111 lots being single family residential, and 6 being open space lots. The site is located at 120 Kreider Avenue, Lancaster, PA 17601 & 2325 Lititz Pike, Lancaster, PA 17601. Motion was made by Sandy Kime and seconded by Nathan van Name to table the plan. Motion carried 6-0. Public comment included concerns about traffic near Lititz Pike. The plan will return after Township Engineer and staff review letters are addressed.",
      eventDate: "2026-02-18T00:00:00.000Z",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-minutes-intel")
    });
    const decision = evaluateItem(item);
    const intelligence = extractMeetingIntelligence(item, decision);

    expect(intelligence?.meeting.body).toBe("Planning Commission");
    const decisionFact = intelligence?.facts.find(
      (fact) => fact.kind === "decision"
    );

    expect(decisionFact?.summary).toContain("Ashford Meadows");
    expect(decisionFact?.summary).toContain("117 lots");
    expect(decisionFact?.summary).toContain("Motion carried 6-0");
    expect(decisionFact?.summary).not.toMatch(/^Motion carried/i);
    expect(
      intelligence?.facts.some((fact) => fact.kind === "public_comment")
    ).toBe(true);
    expect(
      intelligence?.projects.some((project) =>
        project.projectName.includes("Ashford Meadows")
      )
    ).toBe(true);
  });

  it("merges standalone vote language into a contextual project brief", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-minutes",
      externalId: "pc-minutes-contextual-vote",
      title: "18 February 2026 - Planning Commission Minutes",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3640",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      normalizedText:
        "Planned Residential Development. McNees Wallace & Nurick LLC presented the concept plan which proposes a minor modification to the existing, approved Planned Residential Development within the Richmond Square Shopping Center. Motion was made by Alex Rohrbaugh and seconded by Sandy Kime to recommend approval of the plan and modifications conditioned upon satisfaction of Township Engineer and staff review letters. Motion carried 3-0 with 3 abstentions.",
      eventDate: "2026-02-18T00:00:00.000Z",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-minutes-contextual-vote")
    });
    const intelligence = extractMeetingIntelligence(item, {
      classification: "approved_minutes"
    });
    const summaries = intelligence?.facts.map((fact) => fact.summary) ?? [];
    const decisionFact = intelligence?.facts.find(
      (fact) => fact.kind === "decision"
    );

    expect(summaries.some((summary) => /^Motion carried/i.test(summary))).toBe(
      false
    );
    expect(decisionFact?.summary).toContain("Richmond Square Shopping Center");
    expect(decisionFact?.summary).toContain("McNees Wallace & Nurick LLC");
    expect(decisionFact?.summary).toContain("recommended approval");
    expect(decisionFact?.summary).toContain("Motion carried 3-0");
    expect(decisionFact?.summary).toContain("Watch next");
    expect(decisionFact?.quote).toContain("concept plan");
  });

  it("does not turn meeting access boilerplate into meeting intelligence", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-agenda",
      externalId: "pc-agenda-boilerplate",
      title: "15 April 2026 Planning Commission Agenda",
      sourceUrl: "https://www.manheimtownship.org/AgendaCenter/ViewFile/Agenda/_04152026-2000",
      sourcePageUrl: "https://www.manheimtownship.org/AgendaCenter",
      normalizedText:
        "Planning Commission Agenda. Land Development. The Zoom link can be found on the Township website through the meeting calendar located on the home page.",
      eventDate: "2026-04-15T00:00:00.000Z",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-agenda-boilerplate")
    });
    const intelligence = extractMeetingIntelligence(item, {
      classification: "agenda_posted"
    });

    expect(intelligence?.meeting.sourceType).toBe("agenda");
    expect(intelligence?.facts).toEqual([]);
    expect(intelligence?.projects).toEqual([]);
  });

  it("does not promote agenda sections marked none into resident-facing facts", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-agendas",
      externalId: "pc-agenda-action-none",
      title: "20 May 2026 Planning Commission Agenda",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3674",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=80",
      normalizedText:
        "Subdivision & Land Development Plans - Action - none. Staff Update / Status on LD Projects. B) Brethren Village Tapestrie Development Phase I LD Plan This plan includes Phase I - roadways, utilities, and stormwater management. Future phases will include the development of proposed Mixed Use for lots 2,3,4,&5.",
      eventDate: "2026-05-20T00:00:00.000Z",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-agenda-action-none")
    });
    const intelligence = extractMeetingIntelligence(item, {
      classification: "agenda_posted"
    });
    const summaries = intelligence?.facts.map((fact) => fact.summary) ?? [];

    expect(summaries.some((summary) => /action\s*-\s*none/i.test(summary))).toBe(
      false
    );
    expect(summaries.some((summary) => /Brethren Village/i.test(summary))).toBe(
      true
    );
  });

  it("does not attach adjournment votes to the previous project", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-minutes",
      externalId: "pc-minutes-adjournment",
      title: "18 February 2026 - Planning Commission Minutes",
      sourceUrl: "https://www.manheimtownship.org/Archive.aspx?ADID=3640",
      sourcePageUrl: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      normalizedText:
        "Preliminary Subdivision & Land Development Plan for Ashford Meadows - R-2 Residential Zoning District. Todd Kurl presented the plan which proposes 117 lots. Motion was made by Sandy Kime and seconded by Nathan van Name to table the plan. Motion carried 6-0. Motion was made to adjourn the meeting at 7:53 PM. Motion carried 3-0 with 3 abstentions.",
      eventDate: "2026-02-18T00:00:00.000Z",
      extraction: {
        method: "pdf",
        confidence: 0.91,
        note: "Text extracted from the posted PDF document."
      },
      metadata: {},
      contentHash: hashContent("pc-minutes-adjournment")
    });
    const intelligence = extractMeetingIntelligence(item, {
      classification: "approved_minutes"
    });
    const summaries = intelligence?.facts.map((fact) => fact.summary) ?? [];

    expect(summaries.join(" ")).not.toContain("adjourn");
    expect(summaries.join(" ")).not.toContain("3-0 with 3 abstentions");
    expect(summaries.join(" ")).toContain("Motion carried 6-0");
  });

  it("keeps recording transcript timestamps in extracted facts", () => {
    const item = normalizedSourceItemSchema.parse({
      municipalitySlug: "manheimtownshippa",
      sourceSlug: "planning-commission-recording",
      externalId: "pc-recording-1",
      title: "Planning Commission Recording - March 18, 2026",
      sourceUrl: "https://www.manheimtownship.org/recording",
      sourcePageUrl: "https://www.manheimtownship.org/882/Planning-Commission",
      normalizedText: "Planning Commission meeting recording.",
      eventDate: "2026-03-18T00:00:00.000Z",
      extraction: {
        method: "manual",
        confidence: 0.86
      },
      metadata: {
        recordingUrl: "https://www.manheimtownship.org/recording.mp4",
        transcriptUrl: "https://www.manheimtownship.org/captions.vtt",
        transcriptText:
          "WEBVTT\n\n00:02:10.000 --> 00:02:28.000\nMotion was made to recommend approval of the Ashford Meadows plan conditioned upon staff review letters."
      },
      contentHash: hashContent("pc-recording-1")
    });
    const intelligence = extractMeetingIntelligence(item, {
      classification: "meeting_notice"
    });
    const decisionFact = intelligence?.facts.find(
      (fact) => fact.kind === "decision"
    );

    expect(decisionFact?.sourceType).toBe("recording_transcript");
    expect(decisionFact?.transcriptStartSeconds).toBe(130);
    expect(intelligence?.facts.some((fact) => fact.kind === "recording_reference")).toBe(
      true
    );
  });
});
