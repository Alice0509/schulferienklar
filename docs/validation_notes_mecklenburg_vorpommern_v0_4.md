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

Official amendment PDF:
https://www.regierung-mv.de/serviceassistent/download?id=1681582

Official overview page:
https://www.regierung-mv.de/Landesregierung/bm/Schule/Schulorganisation/Ferientermine/
