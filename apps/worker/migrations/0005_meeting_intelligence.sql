CREATE TABLE IF NOT EXISTS meeting_record (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  source_item_id TEXT NOT NULL UNIQUE,
  content_entry_id TEXT NOT NULL UNIQUE,
  meeting_title TEXT NOT NULL,
  meeting_body TEXT NOT NULL,
  meeting_date TEXT,
  posted_at TEXT,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_page_url TEXT,
  recording_url TEXT,
  transcript_url TEXT,
  source_trail_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (source_item_id) REFERENCES source_item(id),
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_record_municipality_date
  ON meeting_record(municipality_slug, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_record_content_entry_id
  ON meeting_record(content_entry_id);

CREATE TABLE IF NOT EXISTS meeting_fact (
  id TEXT PRIMARY KEY,
  meeting_record_id TEXT NOT NULL,
  municipality_slug TEXT NOT NULL,
  content_entry_id TEXT NOT NULL,
  source_item_id TEXT NOT NULL,
  fact_kind TEXT NOT NULL,
  label TEXT NOT NULL,
  summary TEXT NOT NULL,
  quote TEXT,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_label TEXT NOT NULL,
  transcript_start_seconds REAL,
  transcript_end_seconds REAL,
  confidence REAL NOT NULL,
  project_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (meeting_record_id) REFERENCES meeting_record(id),
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id),
  FOREIGN KEY (source_item_id) REFERENCES source_item(id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_fact_municipality_kind
  ON meeting_fact(municipality_slug, fact_kind);
CREATE INDEX IF NOT EXISTS idx_meeting_fact_meeting_record_id
  ON meeting_fact(meeting_record_id);
CREATE INDEX IF NOT EXISTS idx_meeting_fact_content_entry_id
  ON meeting_fact(content_entry_id);

CREATE TABLE IF NOT EXISTS project_record (
  id TEXT PRIMARY KEY,
  municipality_slug TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  UNIQUE(municipality_slug, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_project_record_municipality
  ON project_record(municipality_slug);

CREATE TABLE IF NOT EXISTS project_event (
  id TEXT PRIMARY KEY,
  project_record_id TEXT NOT NULL,
  meeting_record_id TEXT NOT NULL,
  municipality_slug TEXT NOT NULL,
  content_entry_id TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  quote TEXT,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  confidence REAL NOT NULL,
  event_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_record_id) REFERENCES project_record(id),
  FOREIGN KEY (meeting_record_id) REFERENCES meeting_record(id),
  FOREIGN KEY (municipality_slug) REFERENCES municipality(slug),
  FOREIGN KEY (content_entry_id) REFERENCES content_entry(id)
);

CREATE INDEX IF NOT EXISTS idx_project_event_municipality_date
  ON project_event(municipality_slug, event_date);
CREATE INDEX IF NOT EXISTS idx_project_event_project_record_id
  ON project_event(project_record_id);
