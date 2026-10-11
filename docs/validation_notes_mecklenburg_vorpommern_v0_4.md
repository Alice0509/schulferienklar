# Mecklenburg-Vorpommern v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Mecklenburg-Vorpommern
- School years: 2025/26 through 2029/30
- Default dataset: allgemein bildende Schulen only
- Total events: 44

## Included

- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Pfingstferien
- Sommerferien
- Additional fixed school-free days for allgemein bildende Schulen

## Excluded

- Berufliche Schulen separate holiday dates
- School-specific deviations
- Unterrichtsbeginn / certificates / informational dates
- Public holidays as a separate layer

## Special notes

Mecklenburg-Vorpommern has separate tables for:
1. allgemein bildende Schulen
2. berufliche Schulen

Schulferienklar v0.4 uses the allgemein bildende Schulen table as the default state-level school holiday dataset.

The 2025 amendment removes some formerly listed additional fixed days for 2026/27 and 2027/28 and inserts additional fixed days for 2028/29. This file follows the 6 August 2025 amendment.

For 2027/28, the regulation footnote grants Friday, 18 February 2028 as a school-free bridge day after the winter holidays. It is included as `state_school_free_day`.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Sources

Official consolidated regulation (HTML; last amendment 6 August 2025):
https://www.landesrecht-mv.de/bsmv/document/jlr-NNLMV0000718C

Official overview page:
https://mecklenburg-vorpommern.de/seite/ferientermine

## Source-link audit: 2026-10-10

- The former amendment download redirects to the government portal homepage as HTML, not a PDF. The former overview redirects to the ministry landing page.
- The current ministry overview links to the official consolidated regulation at Landesrecht M-V. Its current full text incorporates the amendment of 6 August 2025.
- All 44 stored general-school events were compared with that full text: 30 holiday periods, 13 additional fixed days and the school-free bridge day on 18 February 2028. School years, event types and inclusive start/end dates match; vocational-school tables were excluded.
- The current ministry overview shows 2026/27 and 2027/28; it is a supplementary source, not the full source for all five stored school years.
- Event IDs, dates, statuses and original `lastCheckedAt` values remain unchanged. This audit date records the new source-link check and comparison separately.
