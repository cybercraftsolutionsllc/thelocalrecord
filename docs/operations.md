# Operations

## Local bootstrap

1. `pnpm install`
2. Create or edit `.env`
3. `pnpm dev`

That is enough for repo and UI work because the app falls back when no database is configured.

## Optional local persistence bootstrap

1. `pnpm db:push`
2. `pnpm db:seed`

## Local ingest

- All municipalities:
  `pnpm ingest:run`
- Single municipality:
  `pnpm --filter @thelocalrecord/ingest ingest --slug=manheimtownshippa`

## Expected workflow behavior

- The pipeline is idempotent for unchanged source items.
- New or changed items create diff events.
- Public entries are created only when auto-publish rules allow it.
- Review-required items stay out of the public locality page.

## GitHub Actions expectations

- CI should install dependencies, initialize Prisma, seed registry data, lint, test, and build.
- Scheduled ingest should log source counts and diff counts for debugging.
- Production persistence requires a configured `DATABASE_URL` secret.

## Debugging source breakage

- Run ingest locally for the affected municipality.
- Inspect the latest source page HTML and selector assumptions in the adapter.
- Check `artifact` hashes to confirm whether the source changed or the parser drifted.
