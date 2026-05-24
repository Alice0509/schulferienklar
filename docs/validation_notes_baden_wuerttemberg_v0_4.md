# Baden-Württemberg v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Baden-Württemberg
- School years: 2025/26 through 2029/30
- Additional partial long-range entry: Sommerferien 2030
- Total events: 30

## Included

- Sommerferien
- Herbstferien
- Weihnachtsferien
- Osterferien
- Pfingstferien
- Official state-wide schulfrei footnote dates outside holiday ranges:
  - 31 October 2025
  - 31 October 2026
  - 25 March 2027
  - 13 April 2028

## Excluded

- Bewegliche Ferientage
- Unterrichtsfreie Samstage
- School-specific dates
- Public holidays as a separate layer

## Special notes

Baden-Württemberg does not list uniform Winterferien/Frühjahrsferien in the official holiday list. Many winter/Fasching breaks are based on movable holidays or local school arrangements and are therefore excluded from the default Schulferienklar dataset.

31 October 2028 and 31 October 2029 are mentioned as school-free in the official footnote, but they fall within the listed Herbstferien periods and are therefore not duplicated as separate events.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Baden-Württemberg Kultusministerium page:
https://km.baden-wuerttemberg.de/de/service/ferien
