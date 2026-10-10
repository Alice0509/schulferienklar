# Sachsen-Anhalt v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Sachsen-Anhalt
- School years: 2025/26 through 2029/30
- Total events: 33

## Included

- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Pfingstferien
- Sommerferien
- Official state-level Ferientag entries

## Excluded

- Bewegliche Ferientage
- Einschulungstermin
- Unterrichtsbeginn
- Zeugnis dates
- School-specific dates
- Public holidays as a separate layer

## Special notes

The official PDF lists Bewegliche Ferientage only as counts:
- 2025/26: 2
- 2026/27: 2
- 2027/28: 1
- 2028/29: 2
- 2029/30: 1

Since Schulferienklar includes only official state-wide fixed dates in the default dataset, these movable days are excluded.

The official PDF also contains informational dates such as Einschulungstermin, Unterrichtsbeginn, end of school half-year and certificate dates. These are excluded because they are not school holiday periods.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Sachsen-Anhalt Ferienregelung PDF:
https://mb.sachsen-anhalt.de/api/media/Ferientermine_2024_bis_2030.pdf?collection=document

Official overview page:
https://mb.sachsen-anhalt.de/service/page/ferientermine

## Source link repair (2026-10-10)

The former PDF asset URL returns HTTP 404. The current official overview links
to the replacement PDF above. All 33 existing event date ranges were compared
with that PDF and match. Only source URLs were changed; dates, event IDs,
inclusion rules and stored data review dates were preserved.
