# Cloudflare Setup

## Recommended production resource names

- Pages project: `thelocalrecord-web`
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

## Runtime environment variables

- `NEXT_PUBLIC_SITE_URL=https://thelocalrecord.org`
- `CORRECTIONS_EMAIL=...`
- `INGEST_USER_AGENT=thelocalrecord-bot/0.1 (+https://thelocalrecord.org)`

## API token scopes

- `Cloudflare Pages:Edit`
- `Account:D1:Edit`
- `Account:R2:Edit`

Add `Workers Scripts:Edit` only if deployment moves to Workers-based runtime instead of Pages.

## Notes

- The current repo foundation is vendor-neutral and keeps a no-DB fallback for local repo work.
- Production persistence is intended to move to Cloudflare-managed resources instead of local SQLite.
- Scheduled ingest remains GitHub Actions in v1, which keeps cron management simple while the web surface moves toward Cloudflare deployment.
- The remaining deployment work for the page itself is the Cloudflare Pages runtime wiring, GitHub repo connection, and environment/binding setup.
