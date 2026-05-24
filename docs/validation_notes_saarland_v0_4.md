# Saarland v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Saarland
- School years: 2025/26 through 2029/30
- Total events: 26

## Included

- Herbstferien
- Weihnachtsferien
- Fastnachtsferien
- Osterferien
- Pfingstferien, only where listed by the official source
- Sommerferien

## Excluded

- Bewegliche Ferientage
- School-specific dates
- Public holidays as a separate layer
- Informational dates outside school holidays

## Special notes

The official Saarland MBK page states that Fastnachtsferien remain part of the Saarland holiday order.

The official page lists bewegliche Ferientage by school year:
- 2025/26: 2
- 2026/27: 2
- 2027/28: 1
- 2028/29: 0
- 2029/30: 3

The official page further states that the dates of movable holiday days are set annually by the Schulkonferenz of each school and should be coordinated at municipal level. Therefore they are excluded from Schulferienklar's default state-level dataset.

Pfingstferien are listed only for 2028/29 in the official table and are included only for that year.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Saarland MBK page:
https://www.saarland.de/mbk/DE/aktuelles/medieninformationen/2022/11/221110-PM-ferientermine
