# Architecture

## Principles

- Multi-tenant from day one
- Independent branding and disclaimers everywhere
- Source-linked and audit-friendly publishing
- Conservative automation with explicit review gates
- Simple local development with a clean path to production infrastructure

## Runtime shape

### Public app

- `apps/web`
- Next.js App Router
- Static Pages shell for platform and locality routes
- Reads published entries from the Worker API when `NEXT_PUBLIC_CONTENT_API_BASE` is configured
- Falls back gracefully when live data is unavailable

### Shared core

- `packages/core`
- Municipality registry
- Source registry
- Shared Zod schemas and domain constants

### Ingest pipeline

- `packages/ingest`
- Fetch adapters per source
- Response hashing
- Normalization into shared source item schema
- Idempotent compare against stored hashes

### Editorial layer

- `packages/content`
- Classification rules
- Deterministic summary generation
- Explicit risk gating

### Persistence

- `apps/worker`
- Cloudflare Worker endpoints for read APIs and scheduled ingest
- D1 for normalized records and publications
- R2 for retained raw artifacts and source snapshots

### Legacy local persistence

- `packages/storage`
- Prisma schema and SQLite helpers retained for local development and migration safety

## Core entities

- `municipality`
- `source`
- `fetch_run`
- `source_item`
- `artifact`
- `diff_event`
- `content_entry`
- `publication`
- `correction`

`review_state` is currently modeled as a field on diff and content records rather than a standalone table.

## Data flow

1. A Cloudflare cron or admin trigger runs ingestion in the Worker.
2. Each implemented source adapter fetches the latest public page.
3. Raw responses are hashed and written to retained artifacts.
4. Adapters normalize source items into shared records.
5. The repository compares current hashes to the previously stored hash per `source + externalId`.
6. New or changed items create `diff_event` records.
7. The editorial layer decides whether the item is low risk or review required.
8. Low-risk items create `publication` records; review-required items do not.

## Cloudflare path

The current production direction is now Cloudflare-first:

- Cloudflare for DNS, CDN, TLS, WAF
- Cloudflare Pages for the public web shell
- Cloudflare Worker for API reads and scheduled ingest
- R2 for retained source artifacts
- D1 for production persistence
- GitHub Actions for CI and deploy automation
