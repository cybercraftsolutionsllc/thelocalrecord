-- Regenerate derived meeting intelligence after suppressing meeting-access
-- boilerplate and prioritizing posted minutes during backfill.

DELETE FROM project_event;
DELETE FROM project_record;
DELETE FROM meeting_fact;
DELETE FROM meeting_record;
