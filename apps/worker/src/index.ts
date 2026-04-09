import { getMunicipalityBySlug, municipalities } from "@thelocalrecord/core";

import { listPublishedEntries, listReviewQueue, syncRegistry } from "./d1";
import type { WorkerEnv } from "./env";
import { ingestMunicipality } from "./ingest";

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
      const stats = await ingestMunicipality(env, slug);
      return Response.json({ ok: true, slug, stats }, { headers: jsonHeaders });
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
          await ingestMunicipality(env, municipality.slug);
        }
      })()
    );
  }
};
