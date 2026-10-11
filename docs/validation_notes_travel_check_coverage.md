# Travel period coverage audit

Audit date: 2026-10-11
Baseline: aaae2915b0f98e95bcb66d97119340dca19ba0b7

## Finding

Production Rheinland-Pfalz, 5–11 October 2030, displayed a green empty travel-check result without a coverage explanation at 390 and 1280 px. Requests succeeded and no page errors occurred. The annual school-holiday dataset is partial: the existing readiness evaluation identifies missing later school-year coverage. An empty match therefore cannot confirm a holiday-free trip.

Schleswig-Holstein 2030 has complete coverage and showed an empty result for the same dates. Rheinland-Pfalz 2027 correctly showed its stored autumn holiday. Fresh browser contexts preserved valid state/year query parameters; no query-state override was reproduced.

The travel loader also catches failed data requests and stores null datasets. Previously those null datasets could be rendered as a green empty result. This failure path is tested with deliberately simulated responses; it is not evidence of a failed production data URL.

## Patch scope

Reuse the existing school-holiday readiness evaluation for the travel check's start year. Show a short partial-coverage explanation with the corresponding detail/source link. Preserve known school and public-holiday matches. Label an empty partial result as an absence of matches in stored dates and use the existing warning background instead of green.

Require loaded datasets to match the selected state and start year before displaying results. When data is missing or unavailable, show an unavailable explanation and the sources link instead of an empty result. Loading, invalid ranges and empty input retain their existing behavior.

The tool's documented start-year scope and request behavior are unchanged. This patch does not extend public-holiday loading to additional years of a trip. No date, matching calculation, readiness rule, source review date, SEO page, sitemap, download, index policy or comparison-tool change is included.

## Validation

All 45 existing tests, lint, Vite build and build:seo:checked passed. Ninety-six regeneration-only review-date changes were verified and excluded; tracked public files remain byte-identical to the baseline. SEO, annual calendar and API validation passed again after cleanup.

Twenty-four browser cases cover all 16 states for 2030 and Rheinland-Pfalz and Schleswig-Holstein in 2027/2030 at 320 and 1280 px. Every rendered result count matches the unchanged date-matching calculation. Five additional groups cover simulated school/public data failures, an unsupported start year, invalid/empty inputs, a delayed state switch, year changes and a partial year with stored matches. All checks passed without page errors or horizontal overflow. Representative mobile layout was reviewed after declining optional analytics consent. An initial match fixture used an unrecorded summer period; it was corrected to the dataset's existing Christmas period.

This finding does not establish Google's specific AdSense rejection reason. A separately rechecked NRW secondary source still returns HTTP 404, while its primary official source returns HTTP 200. That source cleanup remains a separate patch.
