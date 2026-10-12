# NRW secondary source link audit

## Base

- Main: `9da4f19b30bad4aa85e5ee7a3edaa6f4296bbf0f` (#285).
- Link audit date: 2026-10-12.

## Finding

The NRW secondary source, `https://www.schulministerium.nrw/ferien`, returns HTTP 404. The existing primary source remains available and redirects to the ministry's current holiday-regulation page.

The replacement, `https://bass.schule.nrw/19662.htm`, returns HTTP 200. BASS is the ministry's official school-regulation collection; this page publishes the holiday regulation for school years 2024/25 through 2029/30, including the years represented in the NRW dataset.

## Change

Replace only the secondary source URL in the original NRW dataset and its browser copy. Regenerate the five NRW state/year detail pages (2026–2030) to carry the same URL.

Preserve the primary source, event dates, IDs, data-check dates, readiness classification, calculations, labels and page layout. The link check is recorded here; it does not claim a new full date verification.

## Validation

- 45 tests, lint and full `build:seo:checked` passed.
- Every generated diff matches HEAD after replacing only the secondary URL and normalizing review dates; 96 date-only files were excluded. Existing review dates were retained in the five changed detail pages.
- Original and browser NRW JSON copies remain byte-identical. All seven existing-file changes are one URL replacement each.
- SEO (106 HTML), annual calendar (80 HTML/ICS/PDF and 16 feeds) and static API (242 JSON) validation passed again after cleanup.
- Ten browser cases passed: NRW 2026–2030 at 390 px and 1280 px. Each source section contains exactly one BASS link and the unchanged primary link. No old broken link, page errors or horizontal overflow.
- Mobile source section screenshot inspected. HTTP 404 for the old secondary URL and HTTP 200 for BASS confirmed independently.
