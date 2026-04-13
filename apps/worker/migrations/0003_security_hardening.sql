CREATE TABLE IF NOT EXISTS newsletter_token (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  token_kind TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  consumed_at TEXT,
  expires_at TEXT,
  FOREIGN KEY (subscription_id) REFERENCES newsletter_subscription(id)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_token_subscription_kind
  ON newsletter_token(subscription_id, token_kind);

CREATE INDEX IF NOT EXISTS idx_newsletter_token_expires_at
  ON newsletter_token(expires_at);

CREATE TABLE IF NOT EXISTS request_rate_limit (
  id TEXT PRIMARY KEY,
  route_key TEXT NOT NULL,
  identifier TEXT NOT NULL,
  bucket_start TEXT NOT NULL,
  request_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (route_key, identifier, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limit_expires_at
  ON request_rate_limit(expires_at);
