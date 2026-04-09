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

- CI should install dependencies, lint, test, and build.
- Deploy automation should apply the D1 schema, deploy the Worker, and publish the Pages build.
- Scheduled ingest should log source counts and diff counts for debugging.
- Cloudflare production requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Model-backed refinement is optional and requires `OPENAI_API_KEY`.

## Debugging source breakage

- Run ingest locally for the affected municipality.
- Or trigger `POST /admin/run?slug=...` on the Worker for a remote test.
- Inspect the latest source page HTML and selector assumptions in the adapter.
- Check `artifact` hashes to confirm whether the source changed or the parser drifted.
