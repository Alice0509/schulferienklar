# Hessen v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Hessen
- School years: 2025/26 through 2029/30
- Total events: 20

## Included

- Herbstferien
- Weihnachtsferien
- Osterferien
- Sommerferien

## Excluded

- Bewegliche Ferientage
- School-specific dates
- Public holidays as a separate layer

## Special notes

The official Hessen Kultus page lists bewegliche Ferientage as counts only:
- 2025/26: 4
- 2026/27: 4
- 2027/28: 3
- 2028/29: 3
- 2029/30: 4

Since Schulferienklar includes only official state-wide fixed dates in the default dataset, these movable days are excluded.

Hessen does not list uniform Winterferien or Pfingstferien in the official holiday table for these school years.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Hessen Kultus page:
https://kultus.hessen.de/schulsystem/ferien/ferientermine
