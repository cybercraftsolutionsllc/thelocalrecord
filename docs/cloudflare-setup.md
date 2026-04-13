# Cloudflare Setup

## Recommended production resource names

- Pages project: `thelocalrecord-web`
- Worker/API service: `thelocalrecord-api`
- Production D1 database: `thelocalrecord-prod`
- Preview D1 database: `thelocalrecord-preview`
- Production R2 bucket: `thelocalrecord-artifacts-prod`
- Preview R2 bucket: `thelocalrecord-artifacts-preview`

## Provisioned resource IDs

- `thelocalrecord-prod`
  `cbf2a916-0881-47a6-ab59-ca081008b2b3`
- `thelocalrecord-preview`
  `f20468b6-8def-411a-9274-aabc3a0d710b`
- `thelocalrecord-artifacts-prod`
  `https://9564a7e0fd47fa3325d8730e88626109.r2.cloudflarestorage.com/thelocalrecord-artifacts-prod`
- `thelocalrecord-artifacts-preview`
  `https://9564a7e0fd47fa3325d8730e88626109.r2.cloudflarestorage.com/thelocalrecord-artifacts-preview`

## Domains

- Primary: `thelocalrecord.org`
- Redirect: `www.thelocalrecord.org`

## Suggested bindings

- D1 binding: `DB`
- R2 binding: `ARTIFACTS`

## GitHub secrets for deployment

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`
- `OPENAI_API_KEY` (optional until LLM refinement is enabled)
- `RESEND_API_KEY`
- `NEWSLETTER_FROM_EMAIL`
- `NEWSLETTER_REPLY_TO`

## Runtime environment variables

- `NEXT_PUBLIC_SITE_URL=https://thelocalrecord.org`
- `NEXT_PUBLIC_CONTENT_API_BASE=https://thelocalrecord-api.cybercraftsolutions.workers.dev`
- `CORRECTIONS_EMAIL=cyber.craft@craftedcybersolutions.com`
- `INGEST_USER_AGENT=thelocalrecord-bot/0.1 (+https://thelocalrecord.org)`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=gpt-5-mini`
- `RESEND_API_KEY=...`
- `NEWSLETTER_FROM_EMAIL=weekly@thelocalrecord.org`
- `NEWSLETTER_REPLY_TO=cyber.craft@craftedcybersolutions.com`

## API token scopes

- `Cloudflare Pages:Edit`
- `Workers Scripts:Edit`
- `Account:D1:Edit`
- `Account:R2:Edit`

## Notes

- The current repo foundation is vendor-neutral and keeps a no-DB fallback for local repo work.
- Production persistence is already being moved to Cloudflare-managed resources through the Worker and D1.
- Scheduled ingest can run in the Worker via cron and deploys can stay automated through GitHub Actions.
- The live hourly ingest, daily archive import, and weekly newsletter generation belong to the Worker cron.
- GitHub Actions is reserved for deploys plus parser smoke checks.
- A Worker foundation now exists in `apps/worker` for D1, R2, scheduled ingest, and OpenAI-backed summary refinement.
