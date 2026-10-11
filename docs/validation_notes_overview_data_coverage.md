# Overview data coverage audit

Audit date: 2026-10-11
Baseline: a185bc5b3151b35653258f441b9907f92efc99c3

## Findings

State/year pages already explain partial school-holiday coverage, but their state and year overview cards omit this distinction. Production Rheinland-Pfalz, Schleswig-Holstein and 2030 overviews returned HTTP 200 and matched the repository apart from existing generated review dates. None had partial-card markers.

Rheinland-Pfalz 2030 has two stored planning periods and Hessen 2030 has three. Schleswig-Holstein 2030 has six and passes the existing readiness evaluation. All three provide official sources and calculated connected free periods; a small event count alone does not establish low-value content.

For comparison, Berlin 2027 has eight planning rows and ten FAQ entries, Bayern 2027 seven and six, and Mecklenburg-Vorpommern 2029 twelve and fourteen. These are structural observations, not Google content thresholds.

All 16 state overviews and five year overviews repeat sentences describing frequently searched phrases. These sentences do not help visitors choose a calendar or understand its data coverage. Google's specific AdSense rejection reasoning is not disclosed.

No Search Console export was found in the audited repository. No index policy change is made from assumed traffic figures.

## Patch scope

Reuse the existing readiness evaluation to label partial entries before visitors open a detail page. Add a short explanation to overviews containing partial entries: missing dates do not imply that no holidays occur.

Exactly 15 state overviews label their 2030 entry. The 2030 year overview labels the same 15 states; Schleswig-Holstein remains unmarked. Ready years and the Schleswig-Holstein overview receive no partial-coverage explanation.

Remove only the frequently-searched-phrases sentences from the 21 overview pages. Extend SEO validation to check each expected card, its readiness label, the overview explanation and the absence of those sentences.

Preserve titles, descriptions, canonicals, internal/external links, all 80 state/year detail pages, sitemap, data, downloads and index policies. Exclude regeneration-only review-date changes.

## Validation

All 42 existing tests and lint passed. The initial full build stopped because the verification environment lacked Chrome. After restoring the browser, build:seo:checked passed, including data, Gold Page gates, annual calendars, PDFs, API, subscriptions, regional parity and Vite.

Twenty-four browser checks covered partial and complete overviews with JavaScript enabled/disabled at 320, 390 and 1280 pixels. Correct row labels and overview explanations were present, without overflow or resource errors. Representative mobile and desktop pages were visually reviewed.

Three deliberate regressions were rejected: removing a partial-card marker, marking a complete card partial, and reintroducing the search-query sentence. Temporary mutations were restored.

After excluding review-date drift, all 80 state/year detail pages and the sitemap remained byte-identical to the baseline. All 21 overview heads and href sequences remained identical. SEO, annual calendar and API validation passed again.
