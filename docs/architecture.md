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
- Reads published entries and source registry
- Falls back gracefully when the database is empty or not initialized yet

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

- `packages/storage`
- Prisma schema
- SQLite for MVP local usage
- Easy future migration path to Postgres

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

1. GitHub Actions or a local command runs ingestion.
2. Each implemented source adapter fetches the latest public page.
3. Raw responses are hashed and stored as artifacts.
4. Adapters normalize source items into shared records.
5. The repository compares current hashes to the previously stored hash per `source + externalId`.
6. New or changed items create `diff_event` records.
7. The editorial layer decides whether the item is low risk or review required.
8. Low-risk items create `publication` records; review-required items do not.

## Cloudflare path

The current codebase avoids hard-wiring a hosting vendor. A likely production path is:

- Cloudflare for DNS, CDN, TLS, WAF
- Cloudflare Pages or Workers for the web surface
- R2 for retained source artifacts
- D1 or external Postgres for production persistence
- GitHub Actions for scheduled source polling

That keeps v1 cheap and simple while leaving room to scale.
