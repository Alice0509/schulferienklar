# Berlin v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Berlin
- School years: 2025/26 through 2029/30
- Total events: 37

## Included

- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Pfingstferien
- Sommerferien
- Official Unterrichtsfreier Tag / Unterrichtsfreie Tage listed in the Berlin Ferienordnung

## Excluded

- Französisches Gymnasium-specific holiday orders
- Staatliche Technikerschule Berlin calendar
- school-specific dates
- non-state-wide school calendar deviations

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Berlin Ferienordnung PDF:
https://www.berlin.de/sen/bjf/service/kalender/ferien/ferienordnung-des-landes-berlin-2024_2025-bis-2029_2030.pdf?ts=1778499519

Official Berlin overview page:
https://www.berlin.de/sen/bjf/service/kalender/ferien/termine/
