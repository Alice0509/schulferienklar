# Annual calendar download coverage audit

Audit date: 2026-10-11
Baseline: d485c870ba359887e4f8b1db90b4d9c77ada3e6d

## Findings

The existing state/year readiness evaluation classifies 15 state calendars for 2030 as partial; Schleswig-Holstein is ready. The state/year pages already explain this limitation, but their annual HTML downloads and generated PDFs use a generic introduction without the limitation.

Rheinland-Pfalz 2030 contains two stored school-holiday periods. Its production annual HTML and PDF both returned HTTP 200 but did not explain why later holiday markings were missing. An unmarked date must not imply that school takes place.

The audited state/year pages contain the following actual planning rows and FAQ entries:

| Page | Planning rows | FAQ entries | Data readiness |
| --- | ---: | ---: | --- |
| Berlin 2027 | 8 | 10 | Ready |
| Bayern 2027 | 7 | 6 | Ready |
| Mecklenburg-Vorpommern 2029 | 12 | 14 | Ready |
| Rheinland-Pfalz 2030 | 2 | 0 | Partial |
| Hessen 2030 | 3 | 0 | Partial |
| Schleswig-Holstein 2030 | 6 | 0 | Ready |

These counts describe structure, not a minimum content requirement or Google's undisclosed AdSense rejection reasoning.

## Patch scope

Reuse the existing readiness evaluation in the annual HTML generator. Replace the introduction only for partial calendars with a short explanation that school holidays are not yet fully captured and checked, and that missing holiday markings do not imply school attendance. The introduction is visible on screen and in printed/generated PDFs.

Extend annual calendar validation to require the explanation on partial calendars and reject partial markers on ready calendars. Keep calendar dates, event IDs, ICS files, source review dates, SEO pages, sitemap, canonicals and index policies unchanged. Regeneration-only review-date changes are excluded from the patch.

## Validation

All 42 existing tests, lint and `build:seo:checked` passed. All 80 PDFs remain one-page A4 landscape; text extraction confirms explanations on exactly 15 partial calendars. Representative Rheinland-Pfalz and Mecklenburg-Vorpommern PDFs were rendered and visually reviewed. Eighteen browser checks covered partial and complete calendars with JavaScript on/off at 320, 390 and 1280 pixels, without overflow or resource errors. Removing a partial-calendar explanation and incorrectly marking a complete calendar were both rejected by the validator.

After excluding generated review-date drift, only the 15 partial-calendar introductions differ. The other 65 annual HTML files and all school-holiday SEO pages remain byte-identical to the baseline. SEO, annual calendar and API validation passed again.
