# State/year search-entry navigation

## Base and finding

- Base: `6ddc4de976cc0804abf68b0255680eebd371350b` (#286).
- Scope: all 16 states, 2026–2030, 80 state/year detail pages.
- Each page placed the same large generic calendar introduction before its holiday planning content. Search visitors had to pass this promotion before reaching dates and downloads.

## Change

Replace the generic image card on state/year detail pages with direct links to the selected state/year interactive calendar, PDF and ICS. Reuse existing navigation styles. Retain the introduction card on state/year overview hubs.

Keep partial-coverage explanations before the new links. Downloaded partial calendars continue to use their existing coverage notices. Preserve all holiday dates, content, metadata, canonical URLs, sources, internal links, calculations and index policies.

Update generated-page validation to require the correct state/year links and existing download files on detail pages, while retaining the overview-card checks.

## Validation

- 45 tests and lint passed. All checked-generation gates passed; Vite build completed successfully after an audit-runtime connection interruption.
- All 80 detail pages were compared with the base after removing only the old promotion/new navigation and normalizing whitespace and generated review dates. All other content and metadata match.
- Excluded 96 unrelated generation-only date changes and retained base review dates on changed detail pages.
- SEO (106 HTML), annual calendar (80 HTML/ICS/PDF and 16 feeds) and static API (242 JSON) validation passed again after cleanup.
- 64 browser cases: all states for 2027 and 2030 at 390 and 1280 px. Correct links, coverage markers, no generic promotion, no page errors or horizontal overflow. PDF/ICS endpoints returned 200 with valid file signatures.
- All checked complete 2027 selections expose actions in a 900 px viewport. Long partial 2030 notices can require scrolling; data limitations remain ahead of download actions.
- Mobile complete and partial page screenshots inspected.

## Search and AdSense interpretation

This is a navigation improvement, not evidence of a ranking or approval outcome. The provided query screenshot does not identify which URL receives impressions, so search titles and descriptions were not changed speculatively. Full Search Console query/page data and the current AdSense rejection details are still needed for account-specific priorities.

Official guidance: https://support.google.com/adsense/answer/7299563 and https://support.google.com/adsense/answer/12176698 emphasize visitor value, clear navigation and accessibility.
