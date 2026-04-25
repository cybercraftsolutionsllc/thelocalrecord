# Workflow Audit

Date: 2026-04-25

## What Was Wrong

The main product workflow was still too close to a content site. Several buttons
named destinations instead of actions, and a few controls exposed internal
implementation language instead of resident outcomes.

## Fixes Made

1. Replaced developer-facing language.
   The locality hero no longer says "API"; it now treats the live data as a
   resident-facing source feed.

2. Reworked locality navigation around user intent.
   The locality nav now points to concrete jobs: search records, ask a question,
   get email updates, trace sources, and report an issue.

3. Made atlas cards honest.
   Atlas cards now explicitly say they search records instead of behaving like
   unlabeled map buttons.

4. Removed disabled-control dead ends.
   Search mode now shows a clear search state and a clear action instead of
   disabled view toggles. Pagination actions only render when they can do
   something useful.

5. Made example questions do the work.
   The ask box examples now submit source-grounded questions instead of only
   filling the textarea and leaving the user to guess the next step.

6. Tightened record-card actions.
   The internal detail link now says "Open full digest record" instead of the
   vague "Read item."

## Remaining Workflow Risks

- The app still needs dedicated project pages for recurring issues. Search is
  useful, but a resident tracking Ashford Meadows or Route 30 should eventually
  land on a dossier with timeline, latest action, next meeting, and source list.
- The conceptual atlas is an orientation aid, not a true GIS map. A production
  community map should be backed by official parcel or GIS data before claiming
  boundaries or exact locations.
- Newsletter signup is still a standard email capture flow. It will be more
  useful once users can choose topics or watchlist terms.
