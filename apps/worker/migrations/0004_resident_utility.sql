ALTER TABLE content_entry ADD COLUMN impact_level TEXT NOT NULL DEFAULT 'routine';

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  provider_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  auth_provider TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile(email);

CREATE TABLE IF NOT EXISTS saved_place (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  raw_address TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  zip TEXT,
  municipality_slug TEXT NOT NULL,
  lat REAL,
  lng REAL,
  geocode_confidence REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_profile(id),
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug)
);

CREATE INDEX IF NOT EXISTS idx_saved_place_user_id ON saved_place(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_place_municipality_slug ON saved_place(municipality_slug);
CREATE INDEX IF NOT EXISTS idx_saved_place_deleted_at ON saved_place(deleted_at);

CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  saved_place_id TEXT,
  municipality_slug TEXT NOT NULL,
  label TEXT NOT NULL,
  query TEXT NOT NULL,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notification_level TEXT NOT NULL DEFAULT 'important',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_profile(id),
  FOREIGN KEY (saved_place_id) REFERENCES saved_place(id),
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_municipality_status ON watchlist(municipality_slug, status);
CREATE INDEX IF NOT EXISTS idx_watchlist_deleted_at ON watchlist(deleted_at);

CREATE TABLE IF NOT EXISTS notification_preference (
  user_id TEXT PRIMARY KEY,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  push_enabled INTEGER NOT NULL DEFAULT 0,
  digest_frequency TEXT NOT NULL DEFAULT 'as_needed',
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  critical_source_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);

CREATE TABLE IF NOT EXISTS push_token (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  device_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_profile(id),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_token_user_id ON push_token(user_id);
CREATE INDEX IF NOT EXISTS idx_push_token_revoked_at ON push_token(revoked_at);

CREATE TABLE IF NOT EXISTS notification_event (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  watchlist_id TEXT,
  municipality_slug TEXT NOT NULL,
  content_entry_id TEXT,
  event_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'observed',
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  read_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_profile(id),
  FOREIGN KEY (watchlist_id) REFERENCES watchlist(id),
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id),
  UNIQUE(user_id, watchlist_id, content_entry_id, event_kind)
);

CREATE INDEX IF NOT EXISTS idx_notification_event_user_id ON notification_event(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_event_municipality_slug ON notification_event(municipality_slug);

CREATE TABLE IF NOT EXISTS community_coverage (
  municipality_slug TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  coverage_level TEXT NOT NULL,
  coverage_notes TEXT NOT NULL,
  last_ingested_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug)
);

CREATE TABLE IF NOT EXISTS entry_geo_entity (
  id TEXT PRIMARY KEY,
  content_entry_id TEXT NOT NULL,
  municipality_slug TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  label TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  lat REAL,
  lng REAL,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id),
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug)
);

CREATE INDEX IF NOT EXISTS idx_entry_geo_entity_content_entry_id ON entry_geo_entity(content_entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_geo_entity_municipality_value ON entry_geo_entity(municipality_slug, normalized_value);
