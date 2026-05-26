DELETE FROM project_event
WHERE meeting_record_id IN (
  SELECT meeting_record.id
  FROM meeting_record
  INNER JOIN source_item ON source_item.id = meeting_record.source_item_id
  WHERE NOT (
    lower(source_item.source_slug) LIKE '%minutes%'
    OR lower(source_item.source_slug) LIKE '%agenda%'
    OR lower(source_item.source_slug) LIKE '%meeting%'
    OR lower(source_item.source_slug) LIKE '%recording%'
    OR lower(source_item.source_slug) LIKE '%transcript%'
    OR lower(source_item.title) LIKE '%minutes%'
    OR lower(source_item.title) LIKE '%agenda%'
    OR lower(source_item.title) LIKE '%meeting%'
    OR lower(source_item.title) LIKE '%recording%'
    OR lower(source_item.title) LIKE '%transcript%'
  )
);

DELETE FROM meeting_fact
WHERE meeting_record_id IN (
  SELECT meeting_record.id
  FROM meeting_record
  INNER JOIN source_item ON source_item.id = meeting_record.source_item_id
  WHERE NOT (
    lower(source_item.source_slug) LIKE '%minutes%'
    OR lower(source_item.source_slug) LIKE '%agenda%'
    OR lower(source_item.source_slug) LIKE '%meeting%'
    OR lower(source_item.source_slug) LIKE '%recording%'
    OR lower(source_item.source_slug) LIKE '%transcript%'
    OR lower(source_item.title) LIKE '%minutes%'
    OR lower(source_item.title) LIKE '%agenda%'
    OR lower(source_item.title) LIKE '%meeting%'
    OR lower(source_item.title) LIKE '%recording%'
    OR lower(source_item.title) LIKE '%transcript%'
  )
);

DELETE FROM meeting_record
WHERE id IN (
  SELECT meeting_record.id
  FROM meeting_record
  INNER JOIN source_item ON source_item.id = meeting_record.source_item_id
  WHERE NOT (
    lower(source_item.source_slug) LIKE '%minutes%'
    OR lower(source_item.source_slug) LIKE '%agenda%'
    OR lower(source_item.source_slug) LIKE '%meeting%'
    OR lower(source_item.source_slug) LIKE '%recording%'
    OR lower(source_item.source_slug) LIKE '%transcript%'
    OR lower(source_item.title) LIKE '%minutes%'
    OR lower(source_item.title) LIKE '%agenda%'
    OR lower(source_item.title) LIKE '%meeting%'
    OR lower(source_item.title) LIKE '%recording%'
    OR lower(source_item.title) LIKE '%transcript%'
  )
);

DELETE FROM project_record
WHERE id NOT IN (
  SELECT DISTINCT project_record_id
  FROM project_event
);
