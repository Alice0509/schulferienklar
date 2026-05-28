# Schulferienklar

Schulferienklar ist eine kleine Web-App, die Schulferien, gesetzliche Feiertage und zusammenhängende freie Zeiten in Deutschland klar im Kalender sichtbar macht.

Website: https://www.schulferienklar.de/

## Was macht Schulferienklar?

Schulferienklar hilft Familien, Schüler:innen und allen, die freie Tage rund um Schulferien besser planen möchten.

Die App zeigt aktuell:

- Schulferien für alle 16 Bundesländer
- gesetzliche Feiertage für alle 16 Bundesländer von 2026 bis 2030
- Auswahl nach Bundesland
- Auswahl nach Jahr
- Listenansicht und Kalenderansicht
- visuelle Markierungen für Ferien, Feiertage, unterrichtsfreie Tage, Wochenenden und freie Zeiten rund um Ferien

## Daten

Die Schulferien-Daten liegen unter:

```txt
data/holidays
```

Die Feiertags-Daten liegen unter:

```txt
data/public-holidays
```

Die Feiertags-Daten unterscheiden zwischen:

- landesweiten Feiertagen
- regionalen Feiertagen
- lokalen Feiertagen

Regionale oder lokale Feiertage sind in den Daten enthalten, werden aber standardmäßig nicht im Kalender angezeigt, wenn sie nicht für das gesamte Bundesland gelten.

## Validierung

Die Daten können mit diesen Befehlen geprüft werden:

```bash
node scripts/validate-holidays.mjs
node scripts/validate-public-holidays.mjs
```

## Index-Dateien erzeugen

```bash
node scripts/generate-holiday-index.mjs
node scripts/generate-public-holidays-index.mjs
```

## Web-App

Die App liegt unter:

```txt
app/
```

Lokal starten:

```bash
cd app
npm install
npm run dev
```

Build erstellen:

```bash
cd app
npm run build
```

## Deployment

Die App wird über GitHub Pages und GitHub Actions veröffentlicht.

Produktive Website:

```txt
https://www.schulferienklar.de/
```

## Status

Schulferienklar ist ein MVP und wird weiterentwickelt.

## English summary

Schulferienklar is a small web app for checking German school holidays, public holidays and connected free days by federal state.

It is designed for families, students and international residents in Germany who want a clear school holiday calendar for planning childcare, travel, study time or free days.

The app currently focuses on:

- German school holidays by Bundesland
- public holidays in Germany
- calendar and list views
- connected free-time periods around school holidays
- a simple overview for planning ahead


## Datenpflege

Der Datenpflege- und Update-Prozess ist dokumentiert in `docs/data-update-plan.md`.
