# Schulferienklar Data Engine Audit

## Executive finding

The datasets are already strong enough for a reusable engine and a future API. The main limitation is duplicated loading, calculations and output logic across the React application and build-time generators.

## Current inventory

### School holidays

- Bundesländer: 16
- Dataset files: 16
- Events audited: 486
- Index version mix: 0.3, 0.4

Categories:

- `school_holiday`: 420
- `state_school_free_day`: 66

Statuses:

- `partial`: 6
- `verified`: 480

Source trust levels:

- `official`: 16

### Public holidays

- Dataset files: 80
- Events audited: 890
- Index version mix: 0.1

Scopes:

- `local`: 5
- `regional`: 15
- `statewide`: 870

Source trust levels:

- `reference`: 80

## Existing strengths

- Stable event IDs
- Inclusive school-holiday end-date semantics
- German and English names
- Source and review metadata
- Public-holiday scope (`statewide`, `regional`, `local`)
- `includeInDefaultCalendar` protection for local exceptions
- Existing data and generated-page validation

## Problems to solve

1. `App.jsx` owns reusable domain calculations: connected free periods, travel matching, Brückentage, calendar filtering and multi-state overlap.
2. Similar JSON loading is repeated for the selected calendar, comparison, Brückentage and travel checks.
3. The annual-calendar generator reimplements date, connected-period and ICS logic.
4. Browser ICS and generated ICS use separate implementations.
5. ICS category mismatch detected: `true`. The data uses `state_school_free_day`; the browser ICS helper checks `school_free`.
6. Public-holiday provenance is not consistently official enough for a commercial SLA.

Duplicate function names found in React and the Jahreskalender generator:

- `addDays`
- `formatDate`
- `isWeekend`
- `toDateKey`

## Target common engine

```text
app/src/domain/
  date.js
  event-types.js
  normalize.js
  periods.js
  bridge-days.js
  overlaps.js
  travel-check.js
  ics.js
app/src/data/
  holiday-repository.js
app/scripts/lib/
  node-data-repository.mjs
app/scripts/
  generate-api-v1.mjs
```

Pure domain modules must be shared by React, SEO generation, Jahreskalender, ICS and API export. Browser/file loading remains environment-specific.

## Normalized event model

```json
{
  "id": "by-school-2027-summer",
  "kind": "school_holiday",
  "subtype": "summer",
  "stateCode": "BY",
  "stateName": "Bayern",
  "name": {"de": "Sommerferien", "en": "Summer holidays"},
  "startDate": "2027-08-02",
  "endDate": "2027-09-13",
  "dateSemantics": "inclusive_end_date",
  "scope": "statewide",
  "includeInDefaultCalendar": true,
  "schoolYear": "2026/27",
  "source": {
    "name": "official source",
    "url": "https://example.invalid",
    "trustLevel": "official",
    "checkedAt": "2026-05-24"
  },
  "dataset": {"version": "0.4", "status": "verified"}
}
```

Public holidays normalize to the same shape with equal `startDate` and `endDate`. Calculated periods remain separate and are never represented as official events.

## API v1 recommendation

Start with generated static JSON because GitHub Pages has no runtime server:

```text
/api/v1/states.json
/api/v1/states/BY/years/2027/events.json
/api/v1/states/BY/years/2027/school-holidays.json
/api/v1/states/BY/years/2027/public-holidays.json
/api/v1/states/BY/years/2027/free-periods.json
/api/v1/states/BY/years/2027/bridge-days.json
```

This validates schema stability and outside usage before adding authentication, rate limits and billing through an edge runtime.

## Static versus dynamic pages

Use a hybrid model, not a full migration:

- Keep static SEO pages as canonical crawlable entry points.
- Use dynamic tools for comparison, personal calculations and calendar setup.
- Link static pages to prefilled dynamic URLs.
- Later embed selected dynamic components into static pages.
- Use an edge backend only for subscriptions, alerts, accounts and paid API access.

High-value dynamic candidates:

1. Multi-state overlap finder
2. Vacation-day optimizer
3. Personal calendar builder
4. Calendar subscription setup
5. Change alerts

## Implementation order

1. Fix the ICS category mismatch.
2. Extract date and event-classification helpers.
3. Extract connected-period, bridge-day and overlap calculations.
4. Add unit tests.
5. Add browser and Node data repositories.
6. Refactor React and Jahreskalender to consume the shared engine.
7. Generate API v1 JSON files.
8. Build the first dynamic differentiator: shared school-free periods for two states.
9. Measure use before selecting a runtime API platform.
