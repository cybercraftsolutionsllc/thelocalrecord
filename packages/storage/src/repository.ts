import type {
  ContentDecision,
  MunicipalityConfig,
  NormalizedSourceItem,
  SourceConfig
} from "@thelocalrecord/core";

import { getSourcesForMunicipality } from "@thelocalrecord/core";

import { prisma } from "./client";

type UpsertedSource = Awaited<ReturnType<typeof prisma.source.upsert>>;

export async function ensureMunicipality(municipality: MunicipalityConfig) {
  const record = await prisma.municipality.upsert({
    where: { slug: municipality.slug },
    update: {
      name: municipality.name,
      state: municipality.state,
      localityType: municipality.localityType,
      shortName: municipality.shortName,
      disclaimer: municipality.disclaimer,
      about: municipality.about,
      correctionsEmail: municipality.correctionsEmail
    },
    create: municipality
  });

  const sources = await Promise.all(
    getSourcesForMunicipality(municipality.slug).map((source) =>
      upsertSource(record.id, source)
    )
  );

  return { municipality: record, sources };
}

async function upsertSource(
  municipalityId: string,
  source: SourceConfig
): Promise<UpsertedSource> {
  return prisma.source.upsert({
    where: {
      municipalityId_slug: {
        municipalityId,
        slug: source.slug
      }
    },
    update: {
      name: source.name,
      description: source.description,
      url: source.url,
      kind: source.kind,
      fetchStrategy: source.fetchStrategy,
      implemented: source.implemented,
      publicCategory: source.publicCategory
    },
    create: {
      municipalityId,
      slug: source.slug,
      name: source.name,
      description: source.description,
      url: source.url,
      kind: source.kind,
      fetchStrategy: source.fetchStrategy,
      implemented: source.implemented,
      publicCategory: source.publicCategory
    }
  });
}

export async function createFetchRun(municipalityId: string) {
  return prisma.fetchRun.create({
    data: {
      municipalityId,
      status: "running"
    }
  });
}

export async function attachRunArtifact(args: {
  fetchRunId: string;
  sourceId: string;
  url: string;
  sha256: string;
  kind: string;
  mimeType?: string;
}) {
  return prisma.artifact.create({
    data: args
  });
}

export async function persistNormalizedItem(args: {
  municipalityId: string;
  sourceId: string;
  fetchRunId: string;
  item: NormalizedSourceItem;
  decision: ContentDecision;
}) {
  const existing = await prisma.sourceItem.findUnique({
    where: {
      sourceId_externalId: {
        sourceId: args.sourceId,
        externalId: args.item.externalId
      }
    }
  });

  const payload = {
    municipalityId: args.municipalityId,
    sourceId: args.sourceId,
    externalId: args.item.externalId,
    title: args.item.title,
    sourceUrl: args.item.sourceUrl,
    sourcePageUrl: args.item.sourcePageUrl,
    normalizedText: args.item.normalizedText,
    publishedAt: args.item.publishedAt ? new Date(args.item.publishedAt) : null,
    eventDate: args.item.eventDate ? new Date(args.item.eventDate) : null,
    contentHash: args.item.contentHash,
    metadataJson: JSON.stringify(args.item.metadata),
    extractionMethod: args.item.extraction.method,
    extractionConfidence: args.item.extraction.confidence,
    extractionNote: args.item.extraction.note ?? null,
    lastSeenAt: new Date()
  };

  if (!existing) {
    const sourceItem = await prisma.sourceItem.create({
      data: payload
    });

    return createDiffAndContent({
      municipalityId: args.municipalityId,
      fetchRunId: args.fetchRunId,
      sourceItemId: sourceItem.id,
      item: args.item,
      decision: args.decision,
      eventType: "created",
      previousHash: null
    });
  }

  if (existing.contentHash === args.item.contentHash) {
    await prisma.sourceItem.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date()
      }
    });

    return null;
  }

  await prisma.sourceItem.update({
    where: { id: existing.id },
    data: payload
  });

  return createDiffAndContent({
    municipalityId: args.municipalityId,
    fetchRunId: args.fetchRunId,
    sourceItemId: existing.id,
    item: args.item,
    decision: args.decision,
    eventType: "updated",
    previousHash: existing.contentHash
  });
}

async function createDiffAndContent(args: {
  municipalityId: string;
  fetchRunId: string;
  sourceItemId: string;
  item: NormalizedSourceItem;
  decision: ContentDecision;
  eventType: "created" | "updated";
  previousHash: string | null;
}) {
  const diffEvent = await prisma.diffEvent.create({
    data: {
      municipalityId: args.municipalityId,
      fetchRunId: args.fetchRunId,
      sourceItemId: args.sourceItemId,
      eventType: args.eventType,
      previousHash: args.previousHash,
      currentHash: args.item.contentHash,
      title: args.item.title,
      classification: args.decision.classification,
      riskLevel: args.decision.riskLevel,
      reviewState: args.decision.reviewState,
      rationaleJson: JSON.stringify(args.decision.rationale)
    }
  });

  const contentEntry = await prisma.contentEntry.create({
    data: {
      municipalityId: args.municipalityId,
      sourceItemId: args.sourceItemId,
      diffEventId: diffEvent.id,
      title: args.item.title,
      summary: args.decision.summary,
      category: args.decision.classification,
      impactLevel: args.decision.impactLevel,
      riskLevel: args.decision.riskLevel,
      reviewState: args.decision.reviewState,
      sourceLinksJson: JSON.stringify([
        {
          label: "Source item",
          url: args.item.sourceUrl
        },
        {
          label: "Source page",
          url: args.item.sourcePageUrl
        }
      ]),
      extractionNote: args.decision.extractionNote ?? null
    }
  });

  if (args.decision.autoPublishAllowed) {
    await prisma.publication.create({
      data: {
        contentEntryId: contentEntry.id,
        path: `/${args.item.municipalitySlug}#${contentEntry.id}`,
        status: "published"
      }
    });
  }

  return diffEvent;
}

export async function completeFetchRun(args: {
  fetchRunId: string;
  status: "completed" | "failed";
  stats: Record<string, number>;
  errorMessage?: string;
}) {
  return prisma.fetchRun.update({
    where: { id: args.fetchRunId },
    data: {
      status: args.status,
      completedAt: new Date(),
      statsJson: JSON.stringify(args.stats),
      errorMessage: args.errorMessage ?? null
    }
  });
}

export async function getPublishedEntriesByMunicipality(slug: string) {
  return prisma.contentEntry.findMany({
    where: {
      municipality: {
        slug
      },
      publication: {
        isNot: null
      }
    },
    include: {
      publication: true,
      sourceItem: {
        include: {
          source: true
        }
      }
    },
    orderBy: {
      publication: {
        publishedAt: "desc"
      }
    }
  });
}

export async function getReviewQueueByMunicipality(slug: string) {
  return prisma.contentEntry.findMany({
    where: {
      municipality: {
        slug
      },
      reviewState: "review_required"
    },
    include: {
      sourceItem: {
        include: {
          source: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getMunicipalityWithSources(slug: string) {
  return prisma.municipality.findUnique({
    where: { slug },
    include: {
      sources: {
        orderBy: {
          name: "asc"
        }
      }
    }
  });
}

export async function close() {
  await prisma.$disconnect();
}
