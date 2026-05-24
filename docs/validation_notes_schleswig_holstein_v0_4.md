# Schleswig-Holstein v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Schleswig-Holstein
- School years: 2025/26 through 2029/30
- Total events: 24

## Included

- Sommerferien, where listed in the official school-year table
- Herbstferien
- Weihnachtsferien
- Frühjahr/Ostern
- Himmelfahrt

## Excluded

- Bewegliche Ferientage
- Fallback dates for bewegliche Ferientage
- Island/Hallig exceptions for Sylt, Föhr, Amrum, Helgoland and Halligen
- Berufsbildende Schule and Landesförderzentrum Internat deviations
- Public holidays as a separate layer

## Special notes

For 2025/26, the official linked PDF lists:
- Herbstferien
- Weihnachtsferien
- Frühjahr/Ostern
- Himmelfahrt
- bewegliche Ferientage

It does not list Sommerferien in that 2025/26 PDF. Therefore no Sommerferien event is included for 2025/26 in this v0.4 file.

The official Schleswig-Holstein page states:
- School holidays are regulated by the Landesverordnung über Ferientermine.
- Bewegliche Ferientage are set by Schulkonferenz after coordination.
- Fallback dates apply only if no agreement is reached.
- Sylt, Föhr, Amrum, Helgoland and Halligen have deviating summer/autumn rules.

These are excluded from Schulferienklar's default state-level dataset.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Sources

Official Schleswig-Holstein overview page:
https://www.schleswig-holstein.de/DE/landesregierung/themen/bildung-hochschulen/ferientermine

Official 2025/26 PDF:
https://www.schleswig-holstein.de/DE/fachinhalte/S/schulrecht/Downloads/Verordnungen/Downloads/Ferientermine_25_26.pdf?__blob=publicationFile&v=2
