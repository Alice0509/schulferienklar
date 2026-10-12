# State comparison coverage audit

Audit date: 2026-10-12
Baseline: 06cddf540fa8d84d7cdaf46cc9997ed6fcbd438f

## Finding

Production Rheinland-Pfalz and Schleswig-Holstein 2030 displayed two stored common holiday periods without explaining that Rheinland-Pfalz school-holiday coverage is partial. Data requests succeeded, and no page errors or horizontal overflow occurred. The 2027 comparison and the complete Schleswig-Holstein 2030 dataset were checked as controls.

The comparison loader also converts failed dataset requests to null. The existing summaries treated missing data as an empty holiday array, allowing loading or failed comparisons to resemble a normal absence of common holidays. This failure path is validated with a deliberately simulated response; no production data-request failure is claimed.

## Patch scope

Reuse the existing annual readiness evaluator for each selected comparison dataset. Explain partial coverage, name only the affected states and link to their corresponding state/year detail pages. Retain known overlap results once every selected dataset has loaded.

Distinguish pending datasets from failed or unavailable datasets. Show loading or unavailable information and suppress normal empty results, overlap markers and period details until selected data is available. Changing states or years updates the explanation; complete selections carry no partial marker.

No dates, overlap calculation, readiness rule, selected-state behavior, four-state limit, requests, CSS, SEO pages, source review dates, sitemap, downloads, ICS or index policies are changed.

## Validation

All 45 existing tests, lint, Vite build and build:seo:checked passed. Twenty-two browser cases covered all 16 states for 2030, complete and partial selections at 320, 390 and 1280 px, and a four-state comparison. Displayed marked days and period counts exactly matched a snapshot taken from the unchanged calculation before the patch. Links point to existing year detail pages.

Two additional groups covered a simulated failed school dataset and delayed loading followed by state/year changes. Neither pending nor failed data rendered a normal empty result or stale overlap markers. All browser checks passed without page errors or horizontal overflow. Representative mobile layout was reviewed after declining optional analytics consent.

Ninety-six regeneration-only review-date changes were verified and excluded. All tracked public files remain byte-identical to the baseline. SEO, annual calendar and API validation passed again after cleanup.

This finding does not establish Google's specific AdSense rejection reason.
