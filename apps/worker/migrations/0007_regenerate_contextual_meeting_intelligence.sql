-- Meeting intelligence is derived from source_item/content_entry text.
-- Clear the first sentence-level extraction pass so the Worker backfill can
-- rebuild contextual resident-facing briefs with motions attached to projects.

DELETE FROM project_event;
DELETE FROM project_record;
DELETE FROM meeting_fact;
DELETE FROM meeting_record;
