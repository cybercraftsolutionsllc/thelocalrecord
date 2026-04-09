# thelocalrecord

thelocalrecord is an independent, resident-run local government digest platform built to track public municipal sources, detect changes, and publish source-linked updates without pretending to be an official government website.

This repository is scaffolded as a multi-tenant foundation from day one. The first municipality is Manheim Township, Pennsylvania, exposed at `/manheimtownshippa`.

## Positioning

- This is not an official township website.
- It is a citizen-run digest with persistent independence disclaimers.
- Public entries must link back to underlying source material.
- Unsupported claims, mimicry of official branding, and editorial spin presented as fact are out of scope.

## MVP scope

- Next.js App Router public site with a homepage and dynamic locality route
- Source registry for Manheim Township
- Scheduled ingestion pipeline for implemented public sources
- Deterministic diff, classification, and risk-gating flow
- SQLite + Prisma persistence with a clear upgrade path to Postgres
- Basic local review queue for items requiring manual review
- Corrections, editorial policy, and source inventory pages

## Repository layout

```text
apps/web                  Public website
packages/core             Shared types, validators, registry, constants
packages/ingest           Fetch + normalize + diff pipeline
packages/content          Classification, summaries, risk gating
packages/storage          Prisma schema and repository helpers
docs                      Architecture, policy, operations, roadmap
.github/workflows         CI and scheduled ingest workflows
```

## Infrastructure direction

The codebase is deployment-neutral, but it is shaped to work well with a Cloudflare-first production setup:

- Cloudflare DNS/CDN/WAF in front of the public site
- Cloudflare Pages or Workers for the web app in phase 2 if desired
- R2 for raw source artifact retention
- D1 or external Postgres for production persistence, depending scaling and ORM/runtime tradeoffs
- GitHub Actions for scheduled ingestion in v1

For local repo work, the public app can run without any database because it has a no-DB fallback. Production persistence is intended to move to Cloudflare-managed resources.

## Local setup

1. Install `pnpm` if needed.
   Recommended: `npm install -g pnpm`
2. Install dependencies:
   `pnpm install`
3. Create or edit `.env` with the required variables.
4. Start the web app:
   `pnpm dev`

The app will be available at `http://localhost:3000`.

If you only want repo and UI work locally, that is enough.

Optional persistence/bootstrap commands are still present for development and CI:

```bash
pnpm db:push
pnpm db:seed
```

## Environment variables

```bash
DATABASE_URL="file:./localrecord.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
INGEST_USER_AGENT="thelocalrecord-bot/0.1 (+https://github.com/your-org/thelocalrecord)"
CORRECTIONS_EMAIL="corrections@example.com"
```

## Ingestion flow

1. Source adapters fetch configured public source pages.
2. Raw responses are hashed and stored as fetch artifacts.
3. Adapters normalize source items into a shared schema.
4. The pipeline compares each normalized item against the previous stored hash.
5. New or changed items are classified and risk-gated.
6. Low-risk items create public entries and publications.
7. High-risk or low-confidence items stay in `review_required`.

Run ingest manually with:

```bash
pnpm ingest:run
```

To target a single municipality:

```bash
pnpm --filter @thelocalrecord/ingest ingest --slug=manheimtownshippa
```

## Current implemented sources

- `Agenda Center`
- `Township News and Information`
- `Alert Center`

Other Manheim Township sources are registered in the source inventory and ready for future adapters.

## Review model

- Low-risk items can auto-publish.
- Planning/zoning material, low-confidence extraction, and other nuanced topics are routed to `/review`.
- The public locality page only shows published entries.

## Adding another municipality later

1. Add the municipality and its sources in [`packages/core/src/index.ts`](/Users/ZeroCool/Desktop/Cyber%20Craft%20Solutions/Projects/thelocalrecord/packages/core/src/index.ts).
2. Implement source adapters inside [`packages/ingest/src/adapters`](/Users/ZeroCool/Desktop/Cyber%20Craft%20Solutions/Projects/thelocalrecord/packages/ingest/src/adapters).
3. Update classification or review rules in [`packages/content/src/index.ts`](/Users/ZeroCool/Desktop/Cyber%20Craft%20Solutions/Projects/thelocalrecord/packages/content/src/index.ts) if needed.
4. Run `pnpm db:seed` again so the municipality and source registry are present in storage.
5. Visit `/<slug>` in the web app.

## Cloudflare production resources

The current production naming plan is documented in [`docs/cloudflare-setup.md`](/Users/ZeroCool/Desktop/Cyber%20Craft%20Solutions/Projects/thelocalrecord/docs/cloudflare-setup.md).

## Scheduled workflows

- `ci.yml` runs lint, test, Prisma setup, and build validation.
- `ingest.yml` supports both manual dispatch and scheduled ingest runs.
- `manual-ingest.yml` provides a dedicated manual trigger for parser checks and targeted runs.

## Phase 2 next steps

- Add calendar and planning/zoning adapters with safer PDF extraction
- Add reviewer actions for approve/reject/correct
- Move artifact storage from source references to durable object storage
- Add municipality onboarding tooling
- Harden deployment for Cloudflare-hosted production
