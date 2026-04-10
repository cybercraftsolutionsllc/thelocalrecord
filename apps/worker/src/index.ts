import { getMunicipalityBySlug, municipalities, normalizedSourceItemSchema } from "@thelocalrecord/core";

import {
  ActiveFetchRunError,
  listPublishedEntries,
  listReviewQueue,
  searchPublishedEntries,
  syncRegistry
} from "./d1";
import type { WorkerEnv } from "./env";
import { importMunicipalityItems, ingestMunicipality } from "./ingest";
import { answerLocalityQuestion } from "./openai";

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type ScheduledController = {
  cron: string;
  scheduledTime: number;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "https://thelocalrecord.org",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: jsonHeaders
      });
    }

    if (url.pathname === "/health") {
      return Response.json(
        {
          ok: true,
          service: "thelocalrecord-api",
          municipalities: municipalities.map((municipality) => municipality.slug)
        },
        { headers: jsonHeaders }
      );
    }

    if (url.pathname === "/admin/sync-registry" && request.method === "POST") {
      await syncRegistry(env.DB);
      return Response.json({ ok: true }, { headers: jsonHeaders });
    }

    if (url.pathname === "/admin/run" && request.method === "POST") {
      const slug = url.searchParams.get("slug") ?? "manheimtownshippa";
      try {
        const stats = await ingestMunicipality(env, slug);
        return Response.json({ ok: true, slug, stats }, { headers: jsonHeaders });
      } catch (error) {
        if (error instanceof ActiveFetchRunError) {
          return Response.json(
            {
              ok: false,
              slug,
              error: "ingest_already_running",
              fetchRunId: error.fetchRunId,
              startedAt: error.startedAt
            },
            { status: 409, headers: jsonHeaders }
          );
        }

        throw error;
      }
    }

    if (url.pathname === "/admin/import" && request.method === "POST") {
      const slug = url.searchParams.get("slug") ?? "manheimtownshippa";
      const payload = (await request.json().catch(() => null)) as
        | { items?: unknown }
        | null;
      const parsedItems = normalizedSourceItemSchema.array().safeParse(payload?.items ?? []);

      if (!parsedItems.success) {
        return Response.json(
          { ok: false, error: "invalid_items" },
          { status: 400, headers: jsonHeaders }
        );
      }

      try {
        const stats = await importMunicipalityItems(env, slug, parsedItems.data);
        return Response.json({ ok: true, slug, stats }, { headers: jsonHeaders });
      } catch (error) {
        if (error instanceof ActiveFetchRunError) {
          return Response.json(
            {
              ok: false,
              slug,
              error: "ingest_already_running",
              fetchRunId: error.fetchRunId,
              startedAt: error.startedAt
            },
            { status: 409, headers: jsonHeaders }
          );
        }

        throw error;
      }
    }

    if (url.pathname.startsWith("/api/localities/")) {
      const [, , , slug, view] = url.pathname.split("/");

      if (!slug || !getMunicipalityBySlug(slug)) {
        return Response.json({ error: "Unknown locality" }, { status: 404, headers: jsonHeaders });
      }

      if (!view || view === "") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
        return Response.json(
          {
            municipality: getMunicipalityBySlug(slug),
            published: await listPublishedEntries(env.DB, slug, page, pageSize),
            review: await listReviewQueue(env.DB, slug)
          },
          { headers: jsonHeaders }
        );
      }

      if (view === "published") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
        return Response.json(await listPublishedEntries(env.DB, slug, page, pageSize), {
          headers: jsonHeaders
        });
      }

      if (view === "search") {
        const query = url.searchParams.get("q")?.trim() ?? "";
        const limit = Number(url.searchParams.get("limit") ?? "18");

        if (!query) {
          return Response.json(
            {
              entries: [],
              total: 0,
              query
            },
            { headers: jsonHeaders }
          );
        }

        const matches = await searchPublishedEntries(env.DB, slug, query, limit);
        return Response.json(
          {
            entries: matches.map((entry) => ({
              id: entry.id,
              title: entry.title,
              summary: entry.summary,
              category: entry.category,
              source_links_json: entry.source_links_json,
              published_at: entry.published_at,
              source_material_date: entry.source_material_date,
              source_name: entry.source_name,
              topic_text: entry.normalized_text
            })),
            total: matches.length,
            query
          },
          { headers: jsonHeaders }
        );
      }

      if (view === "ask" && request.method === "POST") {
        const municipality = getMunicipalityBySlug(slug);
        const body = (await request.json().catch(() => null)) as { question?: string } | null;
        const question = body?.question?.trim() ?? "";

        if (!municipality) {
          return Response.json({ error: "Unknown locality" }, { status: 404, headers: jsonHeaders });
        }

        if (!question) {
          return Response.json(
            {
              mode: "clarify",
              clarifyQuestion: "What do you want to ask about this locality?",
              disclaimer: "AI-assisted answer. Check the cited source links for the official record."
            },
            { headers: jsonHeaders }
          );
        }

        const matches = await searchPublishedEntries(env.DB, slug, question);
        return Response.json(
          await answerLocalityQuestion(env, {
            question,
            municipalityName: municipality.shortName,
            matches
          }),
          { headers: jsonHeaders }
        );
      }

      if (view === "review") {
        return Response.json(await listReviewQueue(env.DB, slug), { headers: jsonHeaders });
      }
    }

    return new Response("Not found", { status: 404 });
  },

  scheduled(_event: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await syncRegistry(env.DB);

        for (const municipality of municipalities) {
          try {
            await ingestMunicipality(env, municipality.slug);
          } catch (error) {
            if (error instanceof ActiveFetchRunError) {
              continue;
            }

            throw error;
          }
        }
      })()
    );
  }
};
