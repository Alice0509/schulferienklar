# Rheinland-Pfalz v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Rheinland-Pfalz
- School years: 2025/26 through 2029/30
- Total events: 20

## Included

- Sommerferien
- Herbstferien
- Weihnachtsferien
- Osterferien

## Excluded

- Bewegliche Ferientage
- Winterferien, because the official table shows none for these school years
- Pfingstferien, because the official table shows none for these school years
- School-specific dates
- Public holidays as a separate layer

## Special notes

The official Rheinland-Pfalz education ministry page lists:
- Sommerferien
- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Pfingstferien

For 2025/26 through 2029/30, Winterferien and Pfingstferien are shown as "---" or blank/not present, so they are not added to the default dataset.

A historical/draft Ferienregelung document for 2024/25–2029/30 states that there are six bewegliche Ferientage per school year. Since those are not fixed state-wide holiday dates, they are excluded from Schulferienklar's default dataset.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Rheinland-Pfalz education ministry page:
https://bm.rlp.de/service/ferientermine
