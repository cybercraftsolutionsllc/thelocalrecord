# Workflow Audit

Date: 2026-04-25

## What Was Wrong

The product still asked residents to understand the site structure before they
could get value. "Dashboard," "records," and "source inventory" are useful to
builders, but a resident wants to know whether something affects their property,
street, commute, meeting, park, or permit.

## Workflow Fixes

1. Search became the first action.
   The homepage now starts with "Run local scan" and sends residents directly
   into the Manheim record with a query.

2. The locality page starts with resident intent.
   The hero and lookup panel ask what affects a property, street, or
   neighborhood instead of asking users to browse a digest.

3. Results explain what to do next.
   Active searches now show likely impact, latest source date, best source lane,
   top matches, and a plain next action.

4. Buttons name actions.
   Locality navigation now uses check an area, ask the record, watch updates,
   trace sources, and fix a detail.

5. The map became a workflow aid.
   The old conceptual atlas was demoted into resident scan examples and a
   four-step "search, scan, source, watch" path.

6. Result cards became verification tools.
   Cards now label resident impact and group actions under "Verify this record."

## Remaining Workflow Risks

- Address search is still text search against public records, not official
  parcel/GIS matching.
- Search results depend on the live content API after the static shell loads.
- Newsletter signup is still broad; topic and location watchlists should come
  next.
