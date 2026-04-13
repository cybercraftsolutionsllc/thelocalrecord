import { getMunicipalityBySlug, municipalities } from "@thelocalrecord/core";

import {
  ActiveFetchRunError,
  confirmNewsletterSubscriptionByToken,
  consumeRateLimit,
  getNewsletterSubscriptionByConfirmationToken,
  getNewsletterSubscriptionByManageToken,
  issueNewsletterConfirmationToken,
  listPublishedEntries,
  listReviewQueue,
  resyncLegacyNewsletterTokens,
  searchPublishedEntries,
  syncRegistry,
  updateNewsletterSubscriptionByManageToken,
  upsertNewsletterSubscription
} from "./d1";
import type { WorkerEnv } from "./env";
import {
  importPlanningCommissionArchives,
  ingestMunicipality,
} from "./ingest";
import {
  generateWeeklyNewsletterIssue,
  sendNewsletterConfirmationEmail
} from "./newsletter";
import { answerLocalityQuestion } from "./openai";

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type ScheduledController = {
  cron: string;
  scheduledTime: number;
};

const PRIMARY_SITE_ORIGIN = "https://thelocalrecord.org";
const STATIC_ALLOWED_ORIGINS = new Set([
  PRIMARY_SITE_ORIGIN,
  "https://www.thelocalrecord.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildJsonHeaders(request)
      });
    }

    if (url.pathname === "/health") {
      return jsonResponse(
        request,
        {
          ok: true,
          service: "thelocalrecord-api",
          municipalities: municipalities.map((municipality) => municipality.slug)
        }
      );
    }

    if (url.pathname.startsWith("/admin/")) {
      if (!isLocalAdminRequest(url)) {
        return new Response("Not found", { status: 404, headers: buildJsonHeaders(request) });
      }

      if (url.pathname === "/admin/sync-registry" && request.method === "POST") {
        await syncRegistry(env.DB);
        return jsonResponse(request, { ok: true });
      }

      if (url.pathname === "/admin/run" && request.method === "POST") {
        const slug = url.searchParams.get("slug") ?? "manheimtownshippa";
        try {
          const result = await ingestMunicipality(env, slug);
          return jsonResponse(request, {
            ok: true,
            slug,
            stats: result.stats,
            sourceFailures: result.sourceFailures
          });
        } catch (error) {
          if (error instanceof ActiveFetchRunError) {
            return jsonResponse(
              request,
              {
                ok: false,
                slug,
                error: "ingest_already_running",
                fetchRunId: error.fetchRunId,
                startedAt: error.startedAt
              },
              { status: 409 }
            );
          }

          throw error;
        }
      }

      return new Response("Not found", { status: 404, headers: buildJsonHeaders(request) });
    }

    if (url.pathname.startsWith("/api/localities/")) {
      const [, , , slug, view] = url.pathname.split("/");
      const municipality = slug ? getMunicipalityBySlug(slug) : null;

      if (!slug || !municipality) {
        return jsonResponse(request, { error: "Unknown locality" }, { status: 404 });
      }

      if (!view || view === "") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
        return jsonResponse(request, {
          municipality,
          published: await listPublishedEntries(env.DB, slug, page, pageSize),
          review: await listReviewQueue(env.DB, slug)
        });
      }

      if (view === "published") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
        return jsonResponse(request, await listPublishedEntries(env.DB, slug, page, pageSize));
      }

      if (view === "search") {
        const rateLimitResponse = await enforceRateLimit(request, env, {
          routeKey: "locality_search",
          limit: 45,
          windowMinutes: 15
        });

        if (rateLimitResponse) {
          return rateLimitResponse;
        }

        const query = url.searchParams.get("q")?.trim() ?? "";
        const limit = Number(url.searchParams.get("limit") ?? "18");

        if (!query) {
          return jsonResponse(request, {
            entries: [],
            total: 0,
            query
          });
        }

        const matches = await searchPublishedEntries(env.DB, slug, query, limit);
        return jsonResponse(request, {
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
        });
      }

      if (view === "ask" && request.method === "POST") {
        const rateLimitResponse = await enforceRateLimit(request, env, {
          routeKey: "locality_ask",
          limit: 10,
          windowMinutes: 15
        });

        if (rateLimitResponse) {
          return rateLimitResponse;
        }

        const body = (await request.json().catch(() => null)) as { question?: string } | null;
        const question = body?.question?.trim() ?? "";

        if (!question) {
          return jsonResponse(request, {
            mode: "clarify",
            clarifyQuestion: "What do you want to ask about this locality?",
            disclaimer: "AI-assisted answer. Check the cited source links for the official record."
          });
        }

        const matches = await searchPublishedEntries(env.DB, slug, question);
        return jsonResponse(
          request,
          await answerLocalityQuestion(env, {
            question,
            municipalityName: municipality.shortName,
            matches
          })
        );
      }

      if (view === "newsletter" && request.method === "POST") {
        const rateLimitResponse = await enforceRateLimit(request, env, {
          routeKey: "newsletter_subscribe",
          limit: 4,
          windowMinutes: 60
        });

        if (rateLimitResponse) {
          return rateLimitResponse;
        }

        if (!env.RESEND_API_KEY || !env.NEWSLETTER_FROM_EMAIL) {
          return jsonResponse(
            request,
            { ok: false, error: "newsletter_unavailable" },
            { status: 503 }
          );
        }

        const body = (await request.json().catch(() => null)) as
          | { email?: string; displayName?: string }
          | null;
        const email = body?.email?.trim() ?? "";

        if (!isValidEmail(email)) {
          return jsonResponse(request, { ok: false, error: "invalid_email" }, { status: 400 });
        }

        const subscription = await upsertNewsletterSubscription(env.DB, {
          municipalitySlug: slug,
          email,
          displayName: body?.displayName?.trim() ?? ""
        });
        const confirmation = await issueNewsletterConfirmationToken(env.DB, {
          municipalitySlug: slug,
          email
        });

        if (!confirmation) {
          return jsonResponse(request, { ok: false, error: "subscription_not_found" }, { status: 500 });
        }

        const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL ?? PRIMARY_SITE_ORIGIN}/newsletter/confirm?token=${encodeURIComponent(confirmation.token)}`;

        await sendNewsletterConfirmationEmail(env, {
          email: subscription.email,
          municipalityName: municipality.shortName,
          confirmUrl
        });

        return jsonResponse(request, {
          ok: true,
          status: subscription.status === "active" ? "confirmation_resent" : "confirmation_sent",
          email: subscription.email
        });
      }

      if (view === "review") {
        return jsonResponse(request, await listReviewQueue(env.DB, slug));
      }
    }

    if (url.pathname === "/api/newsletter/confirm") {
      const rateLimitResponse = await enforceRateLimit(request, env, {
        routeKey: request.method === "POST" ? "newsletter_confirm_submit" : "newsletter_confirm_view",
        limit: request.method === "POST" ? 8 : 20,
        windowMinutes: 15
      });

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      const token = url.searchParams.get("token")?.trim() ?? "";
      if (!token) {
        return jsonResponse(request, { ok: false, error: "missing_token" }, { status: 400 });
      }

      if (request.method === "GET") {
        const pending = await getNewsletterSubscriptionByConfirmationToken(env.DB, token);
        if (!pending) {
          return jsonResponse(request, { ok: false, error: "invalid_token" }, { status: 404 });
        }

        const municipality = getMunicipalityBySlug(pending.subscription.municipality_slug);
        return jsonResponse(request, {
          ok: true,
          subscription: {
            email: pending.subscription.email,
            municipalitySlug: pending.subscription.municipality_slug,
            municipalityName: municipality?.shortName ?? pending.subscription.municipality_slug
          }
        });
      }

      if (request.method === "POST") {
        const confirmed = await confirmNewsletterSubscriptionByToken(env.DB, token);
        if (!confirmed) {
          return jsonResponse(request, { ok: false, error: "invalid_token" }, { status: 404 });
        }

        return jsonResponse(request, {
          ok: true,
          subscription: {
            municipalitySlug: confirmed.subscription.municipality_slug,
            email: confirmed.subscription.email,
            displayName: confirmed.subscription.display_name,
            status: confirmed.subscription.status,
            frequency: confirmed.subscription.frequency,
            manageUrl: `${env.NEXT_PUBLIC_SITE_URL ?? PRIMARY_SITE_ORIGIN}/newsletter/manage?token=${encodeURIComponent(confirmed.manageToken)}`
          }
        });
      }
    }

    if (url.pathname === "/api/newsletter/manage") {
      const rateLimitResponse = await enforceRateLimit(request, env, {
        routeKey: request.method === "POST" ? "newsletter_manage_submit" : "newsletter_manage_view",
        limit: request.method === "POST" ? 15 : 30,
        windowMinutes: 15
      });

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      const token = url.searchParams.get("token")?.trim() ?? "";

      if (!token) {
        return jsonResponse(request, { ok: false, error: "missing_token" }, { status: 400 });
      }

      const subscription = await getNewsletterSubscriptionByManageToken(env.DB, token);

      if (!subscription) {
        return jsonResponse(request, { ok: false, error: "invalid_token" }, { status: 404 });
      }

      if (request.method === "GET") {
        return jsonResponse(request, {
          ok: true,
          subscription: {
            municipalitySlug: subscription.municipality_slug,
            email: subscription.email,
            displayName: subscription.display_name,
            status: subscription.status,
            frequency: subscription.frequency
          }
        });
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

        return jsonResponse(request, {
          ok: true,
          subscription: {
            municipalitySlug: updated?.municipality_slug,
            email: updated?.email,
            displayName: updated?.display_name,
            status: updated?.status,
            frequency: updated?.frequency
          }
        });
      }
    }

    return new Response("Not found", { status: 404, headers: buildJsonHeaders(request) });
  },

  scheduled(event: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await syncRegistry(env.DB);
        await resyncLegacyNewsletterTokens(env.DB);

        if (event.cron === "15 13 * * 1") {
          for (const municipality of municipalities) {
            await generateWeeklyNewsletterIssue(env, municipality.slug);
          }

          return;
        }

        if (event.cron === "37 6 * * *") {
          for (const municipality of municipalities) {
            try {
              const result = await importPlanningCommissionArchives(env, municipality.slug);

              if (result.sourceFailures.length > 0) {
                console.warn(
                  "Archive import completed with source failures",
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

function buildJsonHeaders(request: Request, extraHeaders?: Record<string, string>) {
  const origin = getAllowedOrigin(request);

  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
    ...extraHeaders
  };
}

function jsonResponse(
  request: Request,
  body: unknown,
  init?: ResponseInit
) {
  return Response.json(body, {
    ...init,
    headers: buildJsonHeaders(request, toHeaderRecord(init?.headers))
  });
}

function toHeaderRecord(headers?: HeadersInit) {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return PRIMARY_SITE_ORIGIN;
  }

  if (STATIC_ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }

  if (/^https:\/\/[a-z0-9-]+\.thelocalrecord-web\.pages\.dev$/i.test(origin)) {
    return origin;
  }

  return PRIMARY_SITE_ORIGIN;
}

function isLocalAdminRequest(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

async function enforceRateLimit(
  request: Request,
  env: WorkerEnv,
  args: {
    routeKey: string;
    limit: number;
    windowMinutes: number;
  }
) {
  const result = await consumeRateLimit(env.DB, {
    routeKey: args.routeKey,
    identifier: getClientIdentifier(request),
    limit: args.limit,
    windowMinutes: args.windowMinutes
  });

  if (result.allowed) {
    return null;
  }

  return jsonResponse(
    request,
    { ok: false, error: "rate_limited", retryAfterSeconds: result.retryAfterSeconds },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds)
      }
    }
  );
}

function getClientIdentifier(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }

  return `anon:${request.headers.get("user-agent")?.slice(0, 120) ?? "unknown"}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
