CREATE TABLE IF NOT EXISTS newsletter_subscription (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL,
  frequency TEXT NOT NULL,
  manage_token TEXT NOT NULL UNIQUE,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  last_sent_issue_id TEXT,
  last_sent_at TEXT,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  UNIQUE (municipality_slug, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscription_municipality_slug
  ON newsletter_subscription(municipality_slug);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscription_status
  ON newsletter_subscription(status);

CREATE TABLE IF NOT EXISTS newsletter_issue (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  week_key TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  subject TEXT NOT NULL,
  intro TEXT NOT NULL,
  entries_json TEXT NOT NULL,
  status TEXT NOT NULL,
  delivery_notes TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  UNIQUE (municipality_slug, week_key)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_issue_municipality_slug
  ON newsletter_issue(municipality_slug);
