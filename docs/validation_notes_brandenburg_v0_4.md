# Brandenburg v0.4 validation notes

Created: 2026-05-24

## Scope

- Bundesland: Brandenburg
- School years: 2025/26 through 2029/30
- Total events: 28

## Included

- Herbstferien
- Weihnachtsferien
- Winterferien
- Osterferien
- Pfingsten / Pfingstferien where listed as a fixed holiday date
- Sommerferien

## Excluded

- Variable Ferientage
- School-specific dates
- Public holidays as a separate layer

## Special notes

The official MBJS overview page states that Brandenburg school holidays are coordinated through 2029/30 and that variable holiday days are decided by the respective Schulkonferenzen.

The official Anlage 1 PDF also marks Variable Ferientage with a footnote: "Ferientag, soweit Schulkonferenz keine abweichende Festlegung gemäß Nr. 6 Abs. 2 trifft".

Therefore variable Ferientage are excluded from the default Schulferienklar dataset.

## Variable Ferientage excluded

- 2025/26: 2026-05-15
- 2026/27: 2027-05-07
- 2027/28: 2028-05-26
- 2028/29: 2028-10-30, 2029-04-30, 2029-05-11
- 2029/30: 2030-05-31

## Data semantics

- `endDate` is inclusive for website display.
- For ICS generation, use `DTEND = endDate + 1 day`.

## Source

Official MBJS overview page:
https://mbjs.brandenburg.de/bildung/weitere-themen/schulferien-brandenburg.html

Official Brandenburg Anlage 1 PDF:
https://bravors.brandenburg.de/sixcms/media.php/66/VV-Schulbetrieb-Anlage-1.pdf
