import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { downloadIcsFile, generateIcsCalendar } from "./utils/ics";

const DATA_BASE_URL = import.meta.env.BASE_URL;

const STORAGE_KEYS = {
  bundesland: "schulferienklar:selected-bundesland",
  year: "schulferienklar:selected-year",
};

function dataUrl(path) {
  return `${DATA_BASE_URL}${path.replace(/^\//, "")}`;
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function findPublicHolidayForDate(date, publicHolidays = []) {
  const key = toDateKey(date);

  return publicHolidays.find((holiday) => {
    return holiday.includeInDefaultCalendar && holiday.date === key;
  });
}

function isDefaultFreeDay(date, publicHolidays = []) {
  return isWeekend(date) || Boolean(findPublicHolidayForDate(date, publicHolidays));
}

function getEffectiveFreePeriod(holiday, publicHolidays = []) {
  if (!holiday) return null;

  let start = parseDate(holiday.startDate);
  let end = parseDate(holiday.endDate);

  while (isDefaultFreeDay(addDays(start, -1), publicHolidays)) {
    start = addDays(start, -1);
  }

  while (isDefaultFreeDay(addDays(end, 1), publicHolidays)) {
    end = addDays(end, 1);
  }

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    startsBeforeOfficialHoliday: toDateKey(start) < holiday.startDate,
    endsAfterOfficialHoliday: toDateKey(end) > holiday.endDate,
  };
}

function getFreePeriodStatus(holiday, publicHolidays = []) {
  const period = getEffectiveFreePeriod(holiday, publicHolidays);

  if (!period) {
    return null;
  }

  const start = parseDate(period.startDate);
  const end = parseDate(period.endDate);

  if (start <= TODAY && TODAY <= end) {
    return {
      value: "Heute",
      label: "freie Zeit läuft",
      state: "active",
      period,
    };
  }

  const daysUntil = daysBetween(TODAY, start);

  if (daysUntil === 0) {
    return {
      value: "Heute",
      label: "freie Zeit startet",
      state: "today",
      period,
    };
  }

  return {
    value: String(daysUntil),
    label: daysUntil === 1 ? "Tag bis zur freien Zeit" : "Tage bis zur freien Zeit",
    state: "upcoming",
    period,
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}

function formatMonth(year, monthIndex) {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
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

function formatDayCount(count, singular = "Tag", plural = "Tage") {
  return `${count} ${count === 1 ? singular : plural}`;
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

function getHolidayTone(holiday) {
  if (!holiday) return "";

  if (holiday.category === "public_holiday") {
    return "public";
  }

  if (holiday.category === "state_school_free_day") {
    return "special";
  }

  const type = holiday.type || "";

  if (type.includes("summer")) return "summer";
  if (type.includes("christmas")) return "christmas";
  if (type.includes("easter")) return "easter";
  if (type.includes("autumn")) return "autumn";
  if (type.includes("winter") || type.includes("spring")) return "spring";

  return "holiday";
}

function getMonthKeysForHoliday(holiday) {
  const keys = [];
  const start = parseDate(holiday.startDate);
  const end = parseDate(holiday.endDate);

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= finalMonth) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return keys;
}

function getCalendarMonthKeys(calendarYear) {
  return Array.from({ length: 12 }, (_, index) => {
    return `${calendarYear}-${String(index + 1).padStart(2, "0")}`;
  });
}

function buildMonthCells(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const mondayBasedFirstDay = (firstDay.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < mondayBasedFirstDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function findHolidayForDate(date, holidays, publicHolidays = []) {
  const key = toDateKey(date);

  const schoolHoliday = holidays.find((holiday) => {
    return holiday.startDate <= key && key <= holiday.endDate;
  });

  if (schoolHoliday) {
    return schoolHoliday;
  }

  const publicHoliday = publicHolidays.find((holiday) => {
    return holiday.includeInDefaultCalendar && holiday.date === key;
  });

  if (publicHoliday) {
    return {
      ...publicHoliday,
      category: "public_holiday",
      startDate: publicHoliday.date,
      endDate: publicHoliday.date,
    };
  }

  return null;
}

function findFreePeriodForDate(date, holidays, publicHolidays = []) {
  const key = toDateKey(date);

  return holidays.find((holiday) => {
    const period = getEffectiveFreePeriod(holiday, publicHolidays);

    if (!period) {
      return false;
    }

    return period.startDate <= key && key <= period.endDate;
  });
}

function HolidayCalendar({
  holidays,
  publicHolidays = [],
  selectedYear,
  customMonthKeys = null,
  showLegend = true,
}) {
  const monthKeys = useMemo(() => {
    return customMonthKeys || getCalendarMonthKeys(selectedYear);
  }, [customMonthKeys, selectedYear]);

  if (monthKeys.length === 0) {
    return <p className="empty-state">Keine kommenden Ferien für die Kalenderansicht gefunden.</p>;
  }

  return (
    <div className="calendar-view">
      {showLegend && (
        <div className="calendar-legend">
          <span><i className="legend-swatch legend-holiday" /> Ferien</span>
          <span><i className="legend-swatch legend-public" /> Feiertag</span>
          <span><i className="legend-swatch legend-special" /> Unterrichtsfrei</span>
          <span><i className="legend-outline" /> freie Zeit rund um Ferien</span>
        </div>
      )}

      <div className="calendar-grid">
        {monthKeys.map((key) => {
          const [yearText, monthText] = key.split("-");
          const year = Number(yearText);
          const monthIndex = Number(monthText) - 1;
          const cells = buildMonthCells(year, monthIndex);

          return (
            <section className="month-card" key={key}>
              <h3>{formatMonth(year, monthIndex)}</h3>

              <div className="weekday-row">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="month-days">
                {cells.map((date, index) => {
                  if (!date) {
                    return <span className="calendar-day empty" key={`empty-${index}`} />;
                  }

                  const holiday = findHolidayForDate(date, holidays, publicHolidays);
                  const freePeriodHoliday = findFreePeriodForDate(date, holidays, publicHolidays);
                  const tone = getHolidayTone(holiday);
                  const isToday = toDateKey(date) === toDateKey(TODAY);
                  const isSaturday = date.getDay() === 6;
                  const isSunday = date.getDay() === 0;
                  const isFreePeriodOnly = Boolean(freePeriodHoliday) && !holiday;

                  return (
                    <span
                      className={[
                        "calendar-day",
                        isSaturday ? "is-saturday" : "",
                        isSunday ? "is-sunday" : "",
                        isFreePeriodOnly ? "is-free-period" : "",
                        holiday ? "is-highlighted" : "",
                        tone ? `tone-${tone}` : "",
                        isToday ? "is-today" : "",
                      ].join(" ")}
                      key={toDateKey(date)}
                      title={holiday ? getHolidayLabel(holiday) : ""}
                    >
                      <span>{date.getDate()}</span>
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [index, setIndex] = useState(null);
  const [selectedCode, setSelectedCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("state") || localStorage.getItem(STORAGE_KEYS.bundesland) || "BY";
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const queryYear = Number(params.get("year"));
    const storedYear = Number(localStorage.getItem(STORAGE_KEYS.year));

    if (Number.isFinite(queryYear) && queryYear > 0) {
      return queryYear;
    }

    return Number.isFinite(storedYear) && storedYear > 0
      ? storedYear
      : TODAY.getFullYear();
  });
  const [availablePublicHolidayYears, setAvailablePublicHolidayYears] = useState([
    TODAY.getFullYear(),
  ]);
  const [viewMode, setViewMode] = useState("calendar");
  const [showAllStates, setShowAllStates] = useState(false);
  const [isStateMenuOpen, setIsStateMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bundesland, selectedCode);
  }, [selectedCode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.year, String(selectedYear));
  }, [selectedYear]);
  const [dataset, setDataset] = useState(null);
  const [publicHolidayDataset, setPublicHolidayDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIndex() {
      try {
        setLoading(true);
        const response = await fetch(dataUrl("/data/holidays/index.json"));
        if (!response.ok) {
          throw new Error("Index konnte nicht geladen werden.");
        }
        const data = await response.json();
        setIndex(data);

        const storedCode = localStorage.getItem(STORAGE_KEYS.bundesland);
        const hasStoredDataset = data.datasets?.some((item) => {
          return item.bundeslandCode === storedCode;
        });

        if (!hasStoredDataset && data.datasets?.length > 0) {
          const defaultDataset =
            data.datasets.find((item) => item.bundeslandCode === "BY") ||
            data.datasets[0];

          localStorage.setItem(STORAGE_KEYS.bundesland, defaultDataset.bundeslandCode);
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
        const response = await fetch(dataUrl(`/data/holidays/${selectedMeta.jsonFile}`));
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

  useEffect(() => {
    async function loadPublicHolidays() {
      setPublicHolidayDataset(null);

      try {
        const indexResponse = await fetch(dataUrl("/data/public-holidays/index.json"));

        if (!indexResponse.ok) {
          return;
        }

        const publicHolidayIndex = await indexResponse.json();
        const years = Array.from(
          new Set((publicHolidayIndex.datasets || []).map((item) => item.year))
        ).sort();

        if (years.length > 0) {
          setAvailablePublicHolidayYears(years);

          if (!years.includes(selectedYear)) {
            setSelectedYear(years[0]);
            return;
          }
        }

        const matchingDataset = publicHolidayIndex.datasets?.find((item) => {
          return item.bundeslandCode === selectedCode && item.year === selectedYear;
        });

        if (!matchingDataset) {
          return;
        }

        const datasetResponse = await fetch(
          dataUrl(`/data/public-holidays/${matchingDataset.jsonFile}`)
        );

        if (!datasetResponse.ok) {
          return;
        }

        const data = await datasetResponse.json();
        setPublicHolidayDataset(data);
      } catch {
        setPublicHolidayDataset(null);
      }
    }

    loadPublicHolidays();
  }, [selectedCode, selectedYear]);

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

  const todayPublicHoliday = useMemo(() => {
    return findPublicHolidayForDate(TODAY, publicHolidayDataset?.holidays || []);
  }, [publicHolidayDataset]);

  const nextHolidayFreeStatus = useMemo(() => {
    return getFreePeriodStatus(nextHoliday, publicHolidayDataset?.holidays || []);
  }, [nextHoliday, publicHolidayDataset]);

  const selectedStateDataset = index?.datasets?.find((item) => {
    return item.bundeslandCode === selectedCode;
  });

  const visibleStateDatasets = showAllStates
    ? index?.datasets || []
    : selectedStateDataset
      ? [selectedStateDataset]
      : [];

  const selectBundesland = (nextCode) => {
    localStorage.setItem(STORAGE_KEYS.bundesland, nextCode);
    setSelectedCode(nextCode);
    setIsStateMenuOpen(false);
  };

  const currentMonthKey = `${TODAY.getFullYear()}-${String(
    TODAY.getMonth() + 1
  ).padStart(2, "0")}`;

  const shouldShowCurrentMonthPreview = selectedYear === TODAY.getFullYear();

  const handleDownloadIcs = () => {
    const content = generateIcsCalendar({
      holidays,
      publicHolidays: publicHolidayDataset?.holidays || [],
      selectedCode,
      selectedYear,
    });

    downloadIcsFile({
      content,
      selectedCode,
      selectedYear,
    });
  };

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
              <div className="state-select-wrapper">
                <button
                  className="state-select-button"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isStateMenuOpen}
                  onClick={() => setIsStateMenuOpen((current) => !current)}
                >
                  <span>{selectedStateDataset?.bundeslandName || "Bundesland auswählen"}</span>
                  <span aria-hidden="true">⌄</span>
                </button>

                {isStateMenuOpen && (
                  <div className="state-select-menu" role="listbox">
                    {index?.datasets?.map((item) => (
                      <button
                        className={`state-select-option ${
                          item.bundeslandCode === selectedCode ? "selected" : ""
                        }`}
                        key={item.bundeslandCode}
                        type="button"
                        role="option"
                        aria-selected={item.bundeslandCode === selectedCode}
                        onClick={() => selectBundesland(item.bundeslandCode)}
                      >
                        <span>{item.bundeslandName}</span>
                        <small>{item.bundeslandCode}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                    <span className="metric-number metric-word">
                      {nextHolidayFreeStatus?.value || Math.max(getDaysUntil(nextHoliday), 0)}
                    </span>
                    <span className="metric-label">
                      {nextHolidayFreeStatus?.label ||
                        (Math.max(getDaysUntil(nextHoliday), 0) === 1
                          ? "Tag bis zum Start"
                          : "Tage bis zum Start")}
                    </span>
                  </div>
                  <div>
                    <span className="metric-number">
                      {getHolidayDuration(nextHoliday)}
                    </span>
                    <span className="metric-label">
                      {getHolidayDuration(nextHoliday) === 1 ? "Ferientag" : "Ferientage"}
                    </span>
                  </div>
                </div>

                <p className="date-range">
                  Offizielle Ferien: {formatDate(nextHoliday.startDate)} – {formatDate(nextHoliday.endDate)}
                </p>

                {nextHolidayFreeStatus?.period?.startsBeforeOfficialHoliday && (
                  <p className="free-period-note">
                    Freie Zeit: {formatDate(nextHolidayFreeStatus.period.startDate)} –{" "}
                    {formatDate(nextHolidayFreeStatus.period.endDate)}
                  </p>
                )}

                {todayPublicHoliday && (
                  <p className="today-note">
                    Heute ist Feiertag: {todayPublicHoliday.name.de}
                  </p>
                )}
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
          <div className="section-header overview-header">
            <div>
              <p className="eyebrow">Übersicht</p>
              <h2>{viewMode === "list" ? "Alle kommenden Termine" : `Kalender ${selectedYear}`}</h2>
            </div>

            <div className="view-controls">
              <label className="year-select">
                <span>Jahr</span>
                <select
                  value={selectedYear}
                  onChange={(event) => {
                    const nextYear = Number(event.target.value);
                    localStorage.setItem(STORAGE_KEYS.year, String(nextYear));
                    setSelectedYear(nextYear);
                  }}
                >
                  {availablePublicHolidayYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <div className="view-toggle" aria-label="Ansicht wechseln">
                <button
                  className={viewMode === "list" ? "active" : ""}
                  onClick={() => setViewMode("list")}
                >
                  Liste
                </button>
                <button
                  className={viewMode === "calendar" ? "active" : ""}
                  onClick={() => setViewMode("calendar")}
                >
                  Kalender
                </button>
              </div>
              <span className="small-pill">
                {viewMode === "list" ? `${upcomingHolidays.length} sichtbar` : "markiert"}
              </span>

              <div className="ics-export-wrap">
                <button
                  className="ics-export-button"
                  type="button"
                  onClick={handleDownloadIcs}
                >
                  ICS herunterladen
                </button>
                <span className="ics-export-hint">
                  Für Google Calendar, Apple Kalender und Outlook.
                </span>
              </div>
            </div>
          </div>

          {viewMode === "list" ? (
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
                      <span>{formatDayCount(getHolidayDuration(holiday))}</span>
                      <strong>
                        {(() => {
                          const freeStatus = getFreePeriodStatus(
                            holiday,
                            publicHolidayDataset?.holidays || []
                          );

                          if (isActive || freeStatus?.state === "active") {
                            return "läuft jetzt";
                          }

                          if (freeStatus?.state === "today") {
                            return "startet heute";
                          }

                          return freeStatus?.value && Number.isFinite(Number(freeStatus.value))
                            ? `in ${freeStatus.value} Tagen`
                            : daysUntil === 0
                              ? "startet heute"
                              : `in ${daysUntil} Tagen`;
                        })()}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <>
              {shouldShowCurrentMonthPreview && (
                <section className="current-month-preview">
                  <div className="section-header">
                    <div>
                      <p className="eyebrow">Heute im Blick</p>
                      <h3>Aktueller Monat</h3>
                    </div>
                    <span className="small-pill">schneller Überblick</span>
                  </div>

                  <HolidayCalendar
                    holidays={holidays}
                    publicHolidays={publicHolidayDataset?.holidays || []}
                    selectedYear={selectedYear}
                    customMonthKeys={[currentMonthKey]}
                    showLegend={false}
                  />
                </section>
              )}

              <HolidayCalendar
                holidays={holidays}
                publicHolidays={publicHolidayDataset?.holidays || []}
                selectedYear={selectedYear}
              />
            </>
          )}
        </section>

        <aside className="panel side-panel">
          <p className="eyebrow">Gut vorbereitet</p>
          <h2>Mehr Überblick für freie Tage</h2>
          <p>
            Sieh Ferien frühzeitig und plane Betreuung, Reisen, Lernzeiten oder
            freie Tage entspannter. Schulferienklar hilft dir, den Überblick zu behalten.
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
          {visibleStateDatasets.map((item) => (
            <button
              className={`state-card ${
                item.bundeslandCode === selectedCode ? "selected" : ""
              }`}
              key={item.bundeslandCode}
              onClick={() => selectBundesland(item.bundeslandCode)}
            >
              <span>{item.bundeslandCode}</span>
              <strong>{item.bundeslandName}</strong>
              <small>{item.eventCount} Termine</small>
            </button>
          ))}
        </div>

        <button
          className="state-toggle-button"
          type="button"
          onClick={() => setShowAllStates((current) => !current)}
        >
          {showAllStates ? "Bundesländer ausblenden" : "Alle Bundesländer anzeigen"}
        </button>
      </section>

      <footer className="footer site-footer">
        <p className="footer-copyright">© 2026 Joan — All rights reserved.</p>

        <nav className="footer-links" aria-label="Rechtliche und weitere Informationen">
          <a href="/datenquellen.html">Datenquellen</a>
          <a href="/datenschutz.html">Datenschutz</a>
          <a href="/impressum.html">Impressum</a>
          <a href="/support.html">Support</a>
          <a href="/ueber-uns.html">Über uns</a>
        </nav>

        <p className="footer-credit">Designed &amp; developed by Joan.</p>
      </footer>
    </main>
  );
}
