import { useEffect, useMemo, useState } from "react";
import "./App.css";

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}

function daysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / msPerDay);
}

function getHolidayDuration(holiday) {
  return daysBetween(parseDate(holiday.startDate), parseDate(holiday.endDate)) + 1;
}

function getDaysUntil(holiday) {
  return daysBetween(TODAY, parseDate(holiday.startDate));
}

function getHolidayLabel(holiday) {
  return holiday?.name?.de || holiday?.type || "Ferien";
}

function getNextHoliday(holidays) {
  return holidays
    .filter((holiday) => parseDate(holiday.endDate) >= TODAY)
    .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate))[0];
}

function getHeroPattern(code) {
  const patterns = {
    BY: "mountains",
    BE: "city",
    HH: "water",
    SH: "waves",
    MV: "coast",
    BB: "forest",
    BW: "hills",
    NW: "parks",
  };

  return patterns[code] || "calendar";
}

export default function App() {
  const [index, setIndex] = useState(null);
  const [selectedCode, setSelectedCode] = useState("BY");
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIndex() {
      try {
        setLoading(true);
        const response = await fetch("/data/holidays/index.json");
        if (!response.ok) {
          throw new Error("Index konnte nicht geladen werden.");
        }
        const data = await response.json();
        setIndex(data);

        const defaultDataset =
          data.datasets.find((item) => item.bundeslandCode === "BY") ||
          data.datasets[0];

        if (defaultDataset) {
          setSelectedCode(defaultDataset.bundeslandCode);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadIndex();
  }, []);

  const selectedMeta = useMemo(() => {
    return index?.datasets?.find((item) => item.bundeslandCode === selectedCode);
  }, [index, selectedCode]);

  useEffect(() => {
    async function loadDataset() {
      if (!selectedMeta) return;

      try {
        setDatasetLoading(true);
        const response = await fetch(`/data/holidays/${selectedMeta.jsonFile}`);
        if (!response.ok) {
          throw new Error(`${selectedMeta.jsonFile} konnte nicht geladen werden.`);
        }
        const data = await response.json();
        setDataset(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setDatasetLoading(false);
      }
    }

    loadDataset();
  }, [selectedMeta]);

  const holidays = useMemo(() => {
    return dataset?.holidays
      ? [...dataset.holidays].sort(
          (a, b) => parseDate(a.startDate) - parseDate(b.startDate)
        )
      : [];
  }, [dataset]);

  const nextHoliday = useMemo(() => getNextHoliday(holidays), [holidays]);

  const upcomingHolidays = useMemo(() => {
    return holidays.filter((holiday) => parseDate(holiday.endDate) >= TODAY).slice(0, 8);
  }, [holidays]);

  const pattern = getHeroPattern(selectedCode);

  return (
    <main className="page">
      <section className={`hero hero-${pattern}`}>
        <nav className="topbar">
          <div className="brand">
            <span className="brand-mark">S</span>
            <span>Schulferienklar</span>
          </div>
          <span className="badge">Offizielle Bundesland-Daten</span>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Schulferien in Deutschland</p>
            <h1>Schulferien klar sehen. Besser planen.</h1>
            <p className="hero-text">
              Wähle dein Bundesland und sieh sofort, wann die nächsten
              Schulferien beginnen, wie lange sie dauern und welche Termine
              danach kommen.
            </p>

            <div className="selector-card">
              <label htmlFor="bundesland">Bundesland auswählen</label>
              <select
                id="bundesland"
                value={selectedCode}
                onChange={(event) => setSelectedCode(event.target.value)}
                disabled={loading || !index}
              >
                {index?.datasets?.map((item) => (
                  <option key={item.bundeslandCode} value={item.bundeslandCode}>
                    {item.bundeslandName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="next-card">
            <p className="card-label">Nächste Ferien</p>

            {loading || datasetLoading ? (
              <div className="skeleton">Daten werden geladen…</div>
            ) : nextHoliday ? (
              <>
                <h2>{getHolidayLabel(nextHoliday)}</h2>
                <p className="state-name">{selectedMeta?.bundeslandName}</p>

                <div className="metric-row">
                  <div>
                    <span className="metric-number">
                      {Math.max(getDaysUntil(nextHoliday), 0)}
                    </span>
                    <span className="metric-label">Tage bis zum Start</span>
                  </div>
                  <div>
                    <span className="metric-number">
                      {getHolidayDuration(nextHoliday)}
                    </span>
                    <span className="metric-label">Ferientage</span>
                  </div>
                </div>

                <p className="date-range">
                  {formatDate(nextHoliday.startDate)} – {formatDate(nextHoliday.endDate)}
                </p>
              </>
            ) : (
              <p>Keine kommenden Ferien gefunden.</p>
            )}
          </div>
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="content-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Übersicht</p>
              <h2>Alle kommenden Termine</h2>
            </div>
            <span className="small-pill">{upcomingHolidays.length} sichtbar</span>
          </div>

          <div className="holiday-list">
            {upcomingHolidays.map((holiday) => {
              const daysUntil = getDaysUntil(holiday);
              const isActive =
                parseDate(holiday.startDate) <= TODAY &&
                parseDate(holiday.endDate) >= TODAY;

              return (
                <article className="holiday-item" key={holiday.id}>
                  <div className="holiday-main">
                    <span className={`type-dot type-${holiday.category}`} />
                    <div>
                      <h3>{getHolidayLabel(holiday)}</h3>
                      <p>
                        {formatDate(holiday.startDate)} – {formatDate(holiday.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="holiday-meta">
                    <span>{getHolidayDuration(holiday)} Tage</span>
                    <strong>
                      {isActive
                        ? "läuft jetzt"
                        : daysUntil === 0
                          ? "startet heute"
                          : `in ${daysUntil} Tagen`}
                    </strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="panel side-panel">
          <p className="eyebrow">Gut vorbereitet</p>
          <h2>Mehr Überblick für freie Tage</h2>
          <p>
            Schulferienklar startet als klare Ferienübersicht. Später können
            persönliche Notizen, Checklisten, Feriencamp-Ideen, Familienplanung
            und Kalenderexporte dazukommen.
          </p>

          <div className="feature-list">
            <span>✓ Schüler:innen & Familien</span>
            <span>✓ Offizielle Bundesland-Daten</span>
            <span>✓ Erweiterbar für Planung</span>
          </div>
        </aside>
      </section>

      <section className="states-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Auswahl</p>
            <h2>Alle Bundesländer</h2>
          </div>
          <span className="small-pill">
            {index?.totalBundeslaender || 0} Bundesländer · {index?.totalEvents || 0} Termine
          </span>
        </div>

        <div className="state-grid">
          {index?.datasets?.map((item) => (
            <button
              className={`state-card ${
                item.bundeslandCode === selectedCode ? "selected" : ""
              }`}
              key={item.bundeslandCode}
              onClick={() => setSelectedCode(item.bundeslandCode)}
            >
              <span>{item.bundeslandCode}</span>
              <strong>{item.bundeslandName}</strong>
              <small>{item.eventCount} Termine</small>
            </button>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>Schulferienklar</span>
        <span>Offizielle Quellen · Bundesland-Daten · MVP</span>
      </footer>
    </main>
  );
}
