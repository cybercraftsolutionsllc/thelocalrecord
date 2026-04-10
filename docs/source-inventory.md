# Source Inventory

## Manheim Township MVP

### Implemented now

1. `https://www.manheimtownship.org/AgendaCenter`
2. `https://www.manheimtownship.org/CivicAlerts.asp?CID=13`
3. `https://www.manheimtownship.org/AlertCenter.aspx`
4. `https://www.manheimtownship.org/Calendar.aspx`
5. `https://www.manheimtownship.org/iCalendar.aspx`
6. `https://www.manheimtownship.org/1322/View`
7. `https://www.manheimtownship.org/478/Planning-Zoning`
8. `https://www.manheimtownship.org/865/Code-Compliance`
9. `https://www.manheimtownship.org/CivicAlerts.aspx?CID=8`
10. `https://www.manheimtownship.org/Faq.aspx?TID=49`
11. `https://www.manheimtownship.org/1546/Planning-Zoning-FAQs`
12. `https://www.manheimtownship.org/64/Comprehensive-Plan-Homepage`
13. `https://www.manheimtownship.org/882/Planning-Commission`
14. `https://www.manheimtownship.org/886/Zoning-Hearing-Board`
15. `https://www.manheimtownship.org/Archive.aspx?AMID=80`
16. `https://www.manheimtownship.org/Archive.aspx?AMID=81`

## Notes

- The official source registry is multi-tenant ready and now includes permits/code, ordinance/FAQ knowledge surfaces, comprehensive plan material, planning-board pages, and dedicated planning commission agenda/minutes archives in addition to meetings, alerts, news, and calendars.
- The township's codified code is referenced through official township pages and stored as a knowledge link, but direct full-text ingestion from the external `ecode360.com` host is currently limited by anti-bot protection.
- Planning commission archive PDFs are now enriched with extracted meeting text so project names and development discussion can surface in search, Q&A, and summaries.
- PDF-linked agenda materials are retained conservatively in v1 and should not auto-publish if extraction confidence is low.
- The registry is multi-tenant ready; additional municipalities can be appended without changing the public routing pattern.
