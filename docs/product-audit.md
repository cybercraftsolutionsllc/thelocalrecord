# Product Audit: Community Utility Overhaul

Date: 2026-04-25

## Audit Summary

The Local Record has a stronger data foundation than public product surface. The
Manheim Township feed already contains enough material to be useful, but the
previous UI presented it mostly as a digest stream. Residents are more likely to
arrive with a specific question: what changed with a project, when is the next
meeting, where is the source document, or which township page should they trust.

The overhaul moves the public experience toward a civic workbench: briefing,
watchlists, place context, source pulse, search, and official-source trails.

## Key Findings

1. The homepage explained the idea, but not the product.
   The first screen now makes The Local Record itself the main signal and routes
   directly to the Manheim dashboard.

2. The locality page had useful records but weak resident orientation.
   The new civic briefing summarizes loaded records, source count, upcoming
   dated items, topical pulse, source pulse, and watchlist searches.

3. The map was too abstract to help a resident.
   The new community atlas connects recurring feed concepts to familiar local
   anchors such as the municipal office, Route 30 / 222, Overlook Park, the
   Ashford Meadows area, and Richmond Square. It is explicitly labeled as
   conceptual rather than an official boundary or parcel map.

4. Source inventory read like internal implementation status.
   The source page now frames coverage by resident questions and active coverage
   lanes, while preserving the official source list.

5. Visual hierarchy leaned soft and generic.
   The homepage now uses the existing Manheim visual asset as a real hero
   background, reduces decorative gradient treatment, and sharpens calls to
   action around actual community use.

## Implemented Direction

- Keep the source-linked, independent editorial model.
- Put search and source trails at the center of the experience.
- Use the first locality as a working civic dashboard, not just a launch card.
- Make project/place watchlists visible without hard-coding unsupported claims.
- Treat map graphics as orientation aids unless they are backed by official GIS
  or parcel data.

## Next High-Value Work

- Add a lightweight project dossier page for recurring terms like Ashford
  Meadows, Route 30 / 222, Richmond Square, and the parks plan.
- Add source health and last-seen timestamps to the public source inventory.
- Add a small "new since last visit" layer using local storage before adding
  user accounts.
