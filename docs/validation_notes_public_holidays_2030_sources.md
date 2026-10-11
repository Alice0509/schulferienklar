# Public holiday 2030 reference-source audit

Audit date: 2026-10-11

## Problem and replacement references

- The stored primary overview, `https://www.feiertage-deutschland.de/2030/`, returns HTTP 404.
- The former supplementary Nager.Date URL redirects to a new domain; automated access is restricted. This is not evidence that the service is unavailable to all users.
- The replacement primary reference is Kalenderpedia: https://www.kalenderpedia.de/feiertage/feiertage-2030.html
- The supplementary reference is timeanddate: https://www.timeanddate.de/feiertage/deutschland/2030
- Both replacement pages returned HTTP 200 and contained readable holiday tables without JavaScript during this audit. Both are overview references, not official legal sources; `trustLevel` remains `reference`.

## Date and scope comparison

All 178 stored events across the 16 state datasets were compared with the reference tables and the separate local exception:

- Kalenderpedia's nationwide/state matrix matches 175 entries. Its distinction for Mariä Himmelfahrt in parts of Bavaria matches the stored regional scope.
- timeanddate additionally identifies Fronleichnam on 20 June 2030 as regional in parts of Sachsen and Thüringen. These two entries remain excluded from the default statewide calendar.
- Bavaria's official Feiertagsgesetz, Article 1(2), confirms 8 August as a local holiday in Augsburg: https://www.gesetze-bayern.de/Content/Document/BayFTG-1. The Augsburg entry remains local and excluded from the default statewide calendar.
- This comparison is not a complete new audit of all 16 state holiday laws or municipality boundaries.

## Change scope and provenance

The generator and the 16 root/public JSON pairs receive the same replacement reference metadata. The data-sources page lists both new references.

Event IDs, dates, names, scopes, default-calendar flags, creation dates and original `lastCheckedAt` values remain unchanged. This document records the current source-link and date/scope comparison separately from the historical dataset review metadata. No school-holiday data, state/year SEO page, sitemap or canonical URL is changed.
