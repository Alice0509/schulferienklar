# Home calendar coverage audit

Audit date: 2026-10-11
Baseline: 95238d199e7a653da507728475d9ba7773292bf3

## Finding

The home calendar permits selecting 2030 without explaining incomplete school-holiday coverage. Production Rheinland-Pfalz 2030 was reproduced in a browser at 390 px: the year and PDF link were correct, requests succeeded, but no coverage explanation was present. This differs from the detail page and annual downloads, which already explain the limitation.

The existing publication-readiness evaluation marks 15 of the 16 calendars for 2030 partial; Schleswig-Holstein is ready. All 64 calendars for 2026–2029 are ready. Missing stored dates must not be interpreted as an absence of holidays or as school attendance days. This finding does not establish Google's specific AdSense rejection reason.

## Patch scope

Move the existing readiness evaluator into a module without Node filesystem dependencies. Keep the original script entry point as an adapter with its existing repository/state defaults and exported helpers. The evaluation rules, blocker messages and warning messages remain unchanged.

Use that same evaluator with the already loaded school-holiday dataset in the home calendar. Add a short explanation for the selected partial year, covering the annual calendar, PDF and ICS, with a link to its detail page and sources. Keep the explanation available in list view because the year-specific download buttons also remain there. The list still shows upcoming dates across years.

Do not evaluate a previous state's dataset while another state is selected or loading. Missing datasets and invalid years return unknown coverage. Do not add an extra HTTP request, a hard-coded 2030 condition or guessed holiday dates.

## Validation

All 45 tests and lint passed. New tests cover all 80 state/year combinations, unknown input and unverified events. A separate comparison against the pre-patch output confirmed exact equality for every readiness result, blocker and warning.

The first full build stopped because Chrome was not configured in the verification environment. After setting CHROME_PATH to the available browser, build:seo:checked passed, including data validation, readiness/publication gates, annual calendars/PDFs, API, subscriptions, regional parity and Vite.

Twenty-six browser cases covered all 16 states for 2030 and partial/complete calendars at 320, 390 and 1280 px. Both calendar and list views were checked (52 view checks). A delayed dataset request verified that switching from Rheinland-Pfalz to Schleswig-Holstein clears the old partial explanation during loading and leaves the complete calendar unmarked. Switching back and changing between 2027 and 2030 updated the explanation correctly. No horizontal overflow, data request errors or page errors occurred. Representative mobile screens were reviewed after dismissing optional analytics consent with the necessary-functions button.

An initial transition test retained comparison selections from previous cases and therefore loaded the intended delayed dataset early. The test setup was corrected and the browser suite passed again.

Ninety-six regeneration-only review-date changes were verified and excluded. All tracked public/generated files remain byte-identical to the baseline, including SEO pages, sitemap, source data and ICS. SEO, annual calendar and API validation passed again after cleanup. Index policies and calendar calculations remain unchanged.
