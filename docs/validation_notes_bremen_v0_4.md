# Bremen v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Bremen
- School years: 2025/26 through 2029/30
- Additional partial long-range entry: Sommerferien 2030
- Total events: 39

## Included

- Sommerferien
- Herbstferien
- Weihnachtsferien
- Halbjahresferien
- Osterferien
- Pfingsten
- Fixed §1 entries such as:
  - Tag nach Himmelfahrt
  - Tag vor dem 3. Oktober
  - Tag vor dem 1. Mai
  - Tage nach dem 3. Oktober

## Excluded

- Bewegliche Ferientage under §2
- Fallback dates for bewegliche Ferientage
- Unterrichtsfreie Samstage
- Public holidays as a separate layer
- Religious leave rules
- Vocational-school deviations
- Einschulung dates
- Halbjahreszeugnisse dates
- Unterrichtsschluss rules

## Special notes

The official Bremen Ferienverordnung states that first and last holiday days are shown.

§2 says that movable holiday days are set by the Schulkonferenz for the schools of Bremen and Bremerhaven. It also lists fallback dates in case of non-timely determination. Schulferienklar excludes these movable/fallback dates from the default dataset.

The official Bremen education overview page provides an accessible list of the same dates and links to the Ferienverordnung.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Sources

Official Bremen Ferienverordnung:
https://www.transparenz.bremen.de/metainformationen/verordnung-ueber-die-ferien-fuer-die-schulender-stadtgemeinden-bremen-und-bremerhaven-fuer-die-schuljahre-2024-2025-bis-2029-2030-vom-1-november-2022-186886?template=20_gp_ifg_meta_detail_d

Official Bremen overview page:
https://www.bildung.bremen.de/ferientermine-3404
