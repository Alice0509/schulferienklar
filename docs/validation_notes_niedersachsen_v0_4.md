# Niedersachsen v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Niedersachsen
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
- Official state-level single school holiday dates such as:
  - Tag nach Himmelfahrt
  - Tag vor dem 3. Oktober
  - Tag vor dem 1. Mai
  - Tage nach dem 3. Oktober

## Excluded

- School-specific exceptions listed under "Abweichende Regelungen"
- Einschulung dates
- Halbjahreszeugnisse dates
- Unterrichtsschluss rules
- Public holidays as a separate layer
- Religious leave rules

## Special notes

The official Ferienordnung states that first and last holiday days are shown.

The section "Abweichende Regelungen" lists special schools and institutions whose holidays are not covered by this regulation or are set separately. These are excluded from Schulferienklar's default state-level dataset.

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official Niedersachsen Ferienordnung PDF:
https://www.mk.niedersachsen.de/download/97935/Ferienordnung_fuer_die_Schuljahre_2024_25_bis_2029_30.pdf

Official overview page:
https://www.mk.niedersachsen.de/startseite/service/ferientermine/schulferien-und-religiose-feiertage-6491.html
