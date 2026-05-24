# Sachsen v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Sachsen
- School years: 2025/26 through 2029/30
- Total events: 29

## Included

- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Pfingstferien, where listed
- Sommerferien
- Official unterrichtsfreier Tag set by the Kultusministerium

## Excluded

- Frei bewegliche Ferientage
- School-specific dates
- Public holidays as a separate layer
- Schuleinführung / erster Schultag informational dates

## Special notes

For 2025/26, the official page currently lists only:
- Sommerferien: 04.07.2026 – 14.08.2026
- unterrichtsfreier Tag: 15.05.2026
- 1 frei beweglicher Ferientag

Therefore 2025/26 is treated as partial in this dataset.

The official page states that the first and last holiday day are given.

The official page states:
- The unterrichtsfreier Tag is set by the Kultusministerium.
- Frei bewegliche Ferientage can be set by each school in coordination with school administration.

This supports including unterrichtsfreier Tag and excluding frei bewegliche Ferientage.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Sachsen school year dates page:
https://www.schule.sachsen.de/schuljahrestermine-4793.html
