import type { D1Database, R2Bucket } from "./cloudflare";

export interface WorkerEnv {
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  NEXT_PUBLIC_SITE_URL?: string;
  INGEST_USER_AGENT?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  CORRECTIONS_EMAIL?: string;
  RESEND_API_KEY?: string;
  NEWSLETTER_FROM_EMAIL?: string;
  NEWSLETTER_REPLY_TO?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_WEB_API_KEY?: string;
  DEV_RESIDENT_AUTH?: string;
}
