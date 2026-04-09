CREATE TABLE IF NOT EXISTS municipality (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  locality_type TEXT NOT NULL,
  short_name TEXT NOT NULL,
  disclaimer TEXT NOT NULL,
  about TEXT NOT NULL,
  corrections_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source (
  slug TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL,
  fetch_strategy TEXT NOT NULL,
  implemented INTEGER NOT NULL,
  public_category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug)
);

CREATE INDEX IF NOT EXISTS idx_source_municipality_slug ON source(municipality_slug);

CREATE TABLE IF NOT EXISTS fetch_run (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  stats_json TEXT,
  error_message TEXT,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug)
);

CREATE INDEX IF NOT EXISTS idx_fetch_run_municipality_slug ON fetch_run(municipality_slug);

CREATE TABLE IF NOT EXISTS source_item (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  source_slug TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_page_url TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  published_at TEXT,
  event_date TEXT,
  content_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  extraction_method TEXT NOT NULL,
  extraction_confidence REAL NOT NULL,
  extraction_note TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_slug, external_id)
);

CREATE INDEX IF NOT EXISTS idx_source_item_municipality_slug ON source_item(municipality_slug);
CREATE INDEX IF NOT EXISTS idx_source_item_source_slug ON source_item(source_slug);

CREATE TABLE IF NOT EXISTS artifact (
  id TEXT PRIMARY KEY,
  fetch_run_id TEXT,
  source_slug TEXT,
  source_item_id TEXT,
  kind TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  mime_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fetch_run_id) REFERENCES fetch_run(id),
  FOREIGN KEY (source_slug) REFERENCES source(slug),
  FOREIGN KEY (source_item_id) REFERENCES source_item(id)
);

CREATE INDEX IF NOT EXISTS idx_artifact_fetch_run_id ON artifact(fetch_run_id);

CREATE TABLE IF NOT EXISTS diff_event (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  fetch_run_id TEXT NOT NULL,
  source_item_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  classification TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  review_state TEXT NOT NULL,
  rationale_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (fetch_run_id) REFERENCES fetch_run(id),
  FOREIGN KEY (source_item_id) REFERENCES source_item(id)
);

CREATE INDEX IF NOT EXISTS idx_diff_event_municipality_slug ON diff_event(municipality_slug);

CREATE TABLE IF NOT EXISTS content_entry (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  source_item_id TEXT NOT NULL,
  diff_event_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  review_state TEXT NOT NULL,
  source_links_json TEXT NOT NULL,
  extraction_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (source_item_id) REFERENCES source_item(id),
  FOREIGN KEY (diff_event_id) REFERENCES diff_event(id)
);

CREATE INDEX IF NOT EXISTS idx_content_entry_municipality_slug ON content_entry(municipality_slug);

CREATE TABLE IF NOT EXISTS publication (
  id TEXT PRIMARY KEY,
  content_entry_id TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  status TEXT NOT NULL,
  published_at TEXT NOT NULL,
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id)
);

CREATE TABLE IF NOT EXISTS correction (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  content_entry_id TEXT,
  reporter_name TEXT,
  reporter_email TEXT,
  details TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id)
);
