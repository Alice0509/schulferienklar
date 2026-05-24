# Bayern v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Bayern
- School years: 2025/26 through 2029/30
- Additional partial long-range entry: Sommerferien 2030
- Total events: 31

## Included

- Sommerferien
- unterrichtsfreie Tage um Allerheiligen
- Weihnachtsferien
- Frühjahrsferien
- Osterferien
- Pfingstferien

## Excluded

- Berufsschule-specific deviations
- Heimschule-specific deviations
- schulfreie Samstage
- other school-specific dates

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Bayern.Recht Ferienordnung:
https://www.gesetze-bayern.de/Content/Document/BayVV_2230_1_1_0_K_13479/true

Secondary overview:
https://www.km.bayern.de/termine/ferien-und-feiertage
