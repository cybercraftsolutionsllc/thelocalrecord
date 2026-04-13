import {
  parsePlanningCommissionAgendasArchive,
  parsePlanningCommissionMinutesArchive
} from "./adapters/archive-page";
import { enrichSourceItemsWithFetchedDetails } from "./detail-enrichment";

const apiBase =
  process.env.CONTENT_API_BASE ?? "https://thelocalrecord-api.cybercraftsolutions.workers.dev";
const slug = process.env.MUNICIPALITY_SLUG ?? "manheimtownshippa";
const dryRun = process.env.DRY_RUN === "1";

async function main() {
  const sources = [
    {
      sourceSlug: "planning-commission-agendas" as const,
      url: "https://www.manheimtownship.org/Archive.aspx?AMID=80",
      parser: parsePlanningCommissionAgendasArchive
    },
    {
      sourceSlug: "planning-commission-minutes" as const,
      url: "https://www.manheimtownship.org/Archive.aspx?AMID=81",
      parser: parsePlanningCommissionMinutesArchive
    }
  ];

  const imported = [];

  for (const source of sources) {
    const response = await fetch(source.url, {
      headers: {
        "user-agent":
          process.env.INGEST_USER_AGENT ?? "thelocalrecord-bot/0.1 (+https://thelocalrecord.org)"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }

    const html = await response.text();
    const parsed = source.parser(html, source.url);
    const enriched = await enrichSourceItemsWithFetchedDetails(parsed, source.sourceSlug, {
      userAgent: process.env.INGEST_USER_AGENT
    });
    imported.push(...enriched);
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          importedItems: imported.length,
          sampleTitles: imported.slice(0, 5).map((item) => item.title),
          slug
        },
        null,
        2
      )
    );
    return;
  }

  const importResponse = await fetch(`${apiBase}/admin/import?slug=${slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      items: imported
    })
  });

  const payload = (await importResponse.json().catch(() => null)) as unknown;

  if (!importResponse.ok) {
    throw new Error(`Import failed (${importResponse.status}): ${JSON.stringify(payload)}`);
  }

  console.log(
    JSON.stringify(
      {
        importedItems: imported.length,
        apiBase,
        slug,
        payload
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
