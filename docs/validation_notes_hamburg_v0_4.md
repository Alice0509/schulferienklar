# Hamburg v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Hamburg
- School years: 2025/26 through 2029/30
- Total events: 32

## Included

- Herbstferien
- Weihnachtsferien
- Halbjahrespause
- Frühjahrsferien
- Himmelfahrt/Pfingsten
- Sommerferien
- Official Brückentag entries

## Excluded

- Public holidays as a separate layer
- Religious holidays / religious leave information
- Non-school holiday information

## Special notes

The official Hamburg Ferienordnung PDF states that first and last holiday days are shown.

Halbjahrespause is listed in the official table in parentheses and is included as a one-day official school holiday.

Brückentag entries are listed as fixed dates in the official table and are included as state_school_free_day:
- 2028-10-30
- 2030-05-31

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Hamburg Ferienordnung PDF:
https://www.hamburg.de/resource/blob/134372/5bc131bdd36a604f67b361d21f7df37e/ferienordnung-hamburg-2024-2030-data.pdf

Official overview page:
https://www.hamburg.de/politik-und-verwaltung/behoerden/bsfb/schulen/ferien-119492
