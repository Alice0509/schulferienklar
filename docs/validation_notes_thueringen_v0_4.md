# Thüringen v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Thüringen
- School years: 2025/26 through 2029/30
- Total events: 30

## Included

- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Sommerferien
- Official state-wide schulfreier Tag

## Excluded

- Ferientage zur freien Verfügung
- School-specific dates
- Public holidays as a separate layer
- Schuleinführungsfeiern / first day of school informational dates

## Special notes

The official Thüringen page states that the first and last holiday day are shown.

The official page also states that the use of Ferientage zur freien Verfügung is decided by the Schulkonferenz. These dates are therefore excluded from the default Schulferienklar dataset.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Thüringen education ministry page:
https://bildung.thueringen.de/schule/schulwesen/ferien
