import { getMunicipalityBySlug, municipalities, normalizedSourceItemSchema } from "@thelocalrecord/core";

import {
  ActiveFetchRunError,
  getNewsletterSubscriptionByManageToken,
  listPublishedEntries,
  listReviewQueue,
  searchPublishedEntries,
  syncRegistry,
  updateNewsletterSubscriptionByManageToken,
  upsertNewsletterSubscription
} from "./d1";
import type { WorkerEnv } from "./env";
import {
  importMunicipalityItems,
  ingestMunicipality,
  resummarizeMunicipalityItems
} from "./ingest";
import { generateWeeklyNewsletterIssue } from "./newsletter";
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
        const result = await ingestMunicipality(env, slug);
        return Response.json(
          {
            ok: true,
            slug,
            stats: result.stats,
            sourceFailures: result.sourceFailures
          },
          { headers: jsonHeaders }
        );
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
        const result = await importMunicipalityItems(env, slug, parsedItems.data);
        return Response.json(
          {
            ok: true,
            slug,
            stats: result.stats,
            sourceFailures: result.sourceFailures
          },
          { headers: jsonHeaders }
        );
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

    if (url.pathname === "/admin/newsletter/run" && request.method === "POST") {
      const slug = url.searchParams.get("slug") ?? "manheimtownshippa";
      return Response.json(await generateWeeklyNewsletterIssue(env, slug), {
        headers: jsonHeaders
      });
    }

    if (url.pathname === "/admin/resummarize" && request.method === "POST") {
      const slug = url.searchParams.get("slug") ?? "manheimtownshippa";
      const sourceSlugs =
        url.searchParams
          .get("sources")
          ?.split(",")
          .map((value) => value.trim())
          .filter(Boolean) ?? [];

      if (sourceSlugs.length === 0) {
        return Response.json(
          { ok: false, error: "missing_sources" },
          { status: 400, headers: jsonHeaders }
        );
      }

      return Response.json(
        {
          ok: true,
          slug,
          ...(await resummarizeMunicipalityItems(env, slug, sourceSlugs))
        },
        { headers: jsonHeaders }
      );
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

      if (view === "newsletter" && request.method === "POST") {
        const body = (await request.json().catch(() => null)) as
          | { email?: string; displayName?: string }
          | null;
        const email = body?.email?.trim() ?? "";

        if (!isValidEmail(email)) {
          return Response.json(
            { ok: false, error: "invalid_email" },
            { status: 400, headers: jsonHeaders }
          );
        }

        const subscription = await upsertNewsletterSubscription(env.DB, {
          municipalitySlug: slug,
          email,
          displayName: body?.displayName?.trim() ?? ""
        });

        return Response.json(
          {
            ok: true,
            subscription: {
              municipalitySlug: subscription.municipality_slug,
              email: subscription.email,
              displayName: subscription.display_name,
              status: subscription.status,
              manageUrl: `${env.NEXT_PUBLIC_SITE_URL ?? "https://thelocalrecord.org"}/newsletter/manage?token=${subscription.manage_token}`
            }
          },
          { headers: jsonHeaders }
        );
      }

      if (view === "review") {
        return Response.json(await listReviewQueue(env.DB, slug), { headers: jsonHeaders });
      }
    }

    if (url.pathname === "/api/newsletter/manage") {
      const token = url.searchParams.get("token")?.trim() ?? "";

      if (!token) {
        return Response.json(
          { ok: false, error: "missing_token" },
          { status: 400, headers: jsonHeaders }
        );
      }

      const subscription = await getNewsletterSubscriptionByManageToken(env.DB, token);

      if (!subscription) {
        return Response.json(
          { ok: false, error: "invalid_token" },
          { status: 404, headers: jsonHeaders }
        );
      }

      if (request.method === "GET") {
        return Response.json(
          {
            ok: true,
            subscription: {
              municipalitySlug: subscription.municipality_slug,
              email: subscription.email,
              displayName: subscription.display_name,
              status: subscription.status,
              frequency: subscription.frequency
            }
          },
          { headers: jsonHeaders }
        );
      }

      if (request.method === "POST") {
        const body = (await request.json().catch(() => null)) as
          | { action?: string; displayName?: string }
          | null;
        const action = body?.action?.trim() ?? "";
        const nextStatus =
          action === "unsubscribe"
            ? "unsubscribed"
            : action === "resubscribe"
              ? "active"
              : undefined;

        const updated = await updateNewsletterSubscriptionByManageToken(env.DB, {
          manageToken: token,
          displayName: body?.displayName,
          status: nextStatus
        });

        return Response.json(
          {
            ok: true,
            subscription: {
              municipalitySlug: updated?.municipality_slug,
              email: updated?.email,
              displayName: updated?.display_name,
              status: updated?.status,
              frequency: updated?.frequency
            }
          },
          { headers: jsonHeaders }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },

  scheduled(event: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await syncRegistry(env.DB);

        if (event.cron === "15 13 * * 1") {
          for (const municipality of municipalities) {
            await generateWeeklyNewsletterIssue(env, municipality.slug);
          }

          return;
        }

        for (const municipality of municipalities) {
          try {
            const result = await ingestMunicipality(env, municipality.slug);

            if (result.sourceFailures.length > 0) {
              console.warn(
                "Municipality ingest completed with source failures",
                JSON.stringify({
                  municipality: municipality.slug,
                  sourceFailures: result.sourceFailures
                })
              );
            }
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
