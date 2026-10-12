# Vacation planner data availability audit

## Base

- Main: `14bebee63a00afb4d50813493038b88e8bde5499` (#284).
- Audit date: 2026-10-12.

## Reproduction

Production Bayern 2027 at 390 px, with its public-holiday request intercepted to return HTTP 503, displayed both normal empty-result messages. The page therefore described unavailable data as an absence of vacation combinations and classic bridge days.

## Change

Require the public-holiday dataset to match the selected state and year, to contain a holiday array and to finish loading before displaying normal results. Explain unavailable data separately, naming the state and year. Identify loading and unavailable notices with status roles and stable data attributes.

Keep the existing calculations, requests, state changes, dates, vacation budgets and CSS. Do not add school-holiday coverage rules to this public-holiday-only tool. Empty loaded datasets retain the existing calculation behavior.

## Validation

- 45 tests and lint passed.
- Full `build:seo:checked` passed using Chrome 142 in the audit environment.
- Compared all 96 generated public-file changes with HEAD after normalizing review dates; excluded only those date changes.
- SEO (106 HTML), annual calendar (80 HTML/ICS/PDF and 16 feeds) and static API (242 JSON) validation passed after cleanup. Lint passed again.
- 20 normal browser cases passed: all 16 states for 2027, Bayern 2026 and 2030, and vacation budgets of 1 and 30. Cases included 390 px and 1280 px.
- Vacation-day and natural-free-day metrics and all classic bridge dates match the unchanged domain calculations.
- Five additional groups passed: HTTP 503 with recovery by switching state, missing metadata, mismatched dataset year, a valid empty dataset, and delayed year changes with a return to the previous year.
- Loading/unavailable conditions display no normal result cards or empty-result messages. Valid empty data retains its normal empty classic-bridge message.
- No page errors or horizontal overflow in checked cases. Mobile unavailable-state screenshot inspected.
