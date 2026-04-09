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
- Cloudflare Worker API with D1-backed persistence and R2 artifact retention
- Basic review queue for items requiring manual review
- Corrections, editorial policy, and source inventory pages

## Repository layout

```text
apps/web                  Public website
apps/worker               Cloudflare Worker API + scheduled ingest foundation
packages/core             Shared types, validators, registry, constants
packages/ingest           Fetch + normalize + diff pipeline
packages/content          Classification, summaries, risk gating
packages/storage          Legacy local Prisma helpers retained during migration
docs                      Architecture, policy, operations, roadmap
.github/workflows         CI and scheduled ingest workflows
```

## Infrastructure direction

The codebase is deployment-neutral, but it is shaped to work well with a Cloudflare-first production setup:

- Cloudflare DNS/CDN/WAF in front of the public site
- Cloudflare Pages for the public static shell
- Cloudflare Workers for API reads and scheduled ingestion
- R2 for raw source artifact retention
- D1 for production persistence
- GitHub Actions for CI and deploy automation

For local repo work, the public app can still run without any database because it has a no-DB fallback.

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

Optional legacy local persistence/bootstrap commands are still present for development work:

```bash
pnpm db:push
pnpm db:seed
```

## Environment variables

```bash
DATABASE_URL="file:./localrecord.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_CONTENT_API_BASE="https://thelocalrecord-api.cybercraftsolutions.workers.dev"
INGEST_USER_AGENT="thelocalrecord-bot/0.1 (+https://github.com/your-org/thelocalrecord)"
CORRECTIONS_EMAIL="cyber.craft@craftedcybersolutions.com"
CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_API_TOKEN="..."
OPENAI_API_KEY="..."
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

## Cloudflare migration status

- Public site is live on Cloudflare Pages.
- A Cloudflare Worker foundation now exists for:
  scheduled ingest,
  D1-backed persistence,
  R2 artifact storage,
  OpenAI-backed summary refinement,
  and read-only API routes.
- The remaining enrichment step is setting `OPENAI_API_KEY` for model-backed summary refinement.

## Scheduled workflows

- `ci.yml` runs lint, test, and build validation.
- `ingest.yml` supports both manual dispatch and scheduled ingest runs.
- `manual-ingest.yml` provides a dedicated manual trigger for parser checks and targeted runs.
- `deploy-cloudflare.yml` deploys the worker, applies D1 schema, and publishes the static web build.

## Phase 2 next steps

- Add calendar and planning/zoning adapters with safer PDF extraction
- Add reviewer actions for approve/reject/correct
- Move artifact storage from source references to durable object storage
- Add municipality onboarding tooling
- Add authenticated reviewer tools and richer moderation history
