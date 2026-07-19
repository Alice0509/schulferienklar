import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import "./home-refresh.css";
import "./mobile-flow.css";
import { downloadIcsFile, generateIcsCalendar } from "./utils/ics";

const DATA_BASE_URL = import.meta.env.BASE_URL;

const STORAGE_KEYS = {
  bundesland: "schulferienklar:selected-bundesland",
  year: "schulferienklar:selected-year",
  comparisonStates: "schulferienklar:comparison-states",
  comparisonYear: "schulferienklar:comparison-year",
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

function formatCompactDateRange(startValue, endValue) {
  const startDate = parseDate(startValue);
  const endDate = parseDate(endValue);
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth && sameYear) {
    const startDay = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
    }).format(startDate);
    const endDateLabel = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
    }).format(endDate);

    return `${startDay}.–${endDateLabel}`;
  }

  return `${formatDate(startValue)} – ${formatDate(endValue)}`;
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

function getPublicHolidayName(holiday) {
  return holiday?.name?.de || holiday?.name || "Feiertag";
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function getTravelPeriodMatches(startDate, endDate, holidays = [], publicHolidays = []) {
  if (!startDate || !endDate || startDate > endDate) {
    return {
      schoolHolidayMatches: [],
      publicHolidayMatches: [],
    };
  }

  const periodStart = parseDate(startDate);
  const periodEnd = parseDate(endDate);

  const schoolHolidayMatches = holidays.filter((holiday) => {
    return rangesOverlap(
      periodStart,
      periodEnd,
      parseDate(holiday.startDate),
      parseDate(holiday.endDate),
    );
  });

  const publicHolidayMatches = publicHolidays.filter((holiday) => {
    const holidayDate = parseDate(holiday.date);

    return (
      holiday.includeInDefaultCalendar &&
      rangesOverlap(periodStart, periodEnd, holidayDate, holidayDate)
    );
  });

  return {
    schoolHolidayMatches,
    publicHolidayMatches,
  };
}

function getBridgeDaySuggestions(publicHolidays = [], selectedYear) {
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const publicHolidayDates = new Set(
    publicHolidays
      .filter((holiday) => holiday.includeInDefaultCalendar)
      .map((holiday) => holiday.date)
  );

  const isValidVacationDay = (date) => {
    const dateKey = toDateKey(date);
    return !isWeekend(date) && !publicHolidayDates.has(dateKey);
  };

  return publicHolidays
    .filter((holiday) => {
      return holiday.includeInDefaultCalendar && holiday.date >= yearStart && holiday.date <= yearEnd;
    })
    .flatMap((holiday) => {
      const holidayDate = parseDate(holiday.date);
      const day = holidayDate.getDay();
      const holidayName = getPublicHolidayName(holiday);
      const suggestions = [];

      if (day === 2 || day === 4) {
        const bridgeDate = day === 2 ? addDays(holidayDate, -1) : addDays(holidayDate, 1);
        const bridgeDateKey = toDateKey(bridgeDate);

        if (isValidVacationDay(bridgeDate)) {
          const weekendStart = day === 2 ? addDays(holidayDate, -3) : holidayDate;
          const weekendEnd = day === 2 ? holidayDate : addDays(holidayDate, 3);

          suggestions.push({
            id: `${holiday.date}-${bridgeDateKey}`,
            holidayName,
            holidayDate: holiday.date,
            bridgeDate: bridgeDateKey,
            freeStartDate: toDateKey(weekendStart),
            freeEndDate: toDateKey(weekendEnd),
            vacationDays: 1,
            freeDays: 4,
            direction: day === 2 ? "vor dem Feiertag" : "nach dem Feiertag",
          });
        }
      }

      if (day === 3) {
        const beforeVacationDays = [addDays(holidayDate, -2), addDays(holidayDate, -1)];
        const afterVacationDays = [addDays(holidayDate, 1), addDays(holidayDate, 2)];

        if (beforeVacationDays.every(isValidVacationDay)) {
          suggestions.push({
            id: `${holiday.date}-${beforeVacationDays.map(toDateKey).join("-")}`,
            holidayName,
            holidayDate: holiday.date,
            bridgeDate: toDateKey(beforeVacationDays[0]),
            freeStartDate: toDateKey(addDays(holidayDate, -4)),
            freeEndDate: holiday.date,
            vacationDays: 2,
            freeDays: 5,
            direction: "vor dem Feiertag",
          });
        }

        if (afterVacationDays.every(isValidVacationDay)) {
          suggestions.push({
            id: `${holiday.date}-${afterVacationDays.map(toDateKey).join("-")}`,
            holidayName,
            holidayDate: holiday.date,
            bridgeDate: toDateKey(afterVacationDays[0]),
            freeStartDate: holiday.date,
            freeEndDate: toDateKey(addDays(holidayDate, 4)),
            vacationDays: 2,
            freeDays: 5,
            direction: "nach dem Feiertag",
          });
        }
      }

      return suggestions;
    })
    .filter((item) => parseDate(item.bridgeDate) >= TODAY)
    .sort((a, b) => a.bridgeDate.localeCompare(b.bridgeDate));
}

function getNextHoliday(holidays) {
  return holidays
    .filter((holiday) => parseDate(holiday.endDate) >= TODAY)
    .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate))[0];
}

function getHolidaysForYear(holidays, year) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return holidays
    .filter((holiday) => holiday.startDate <= yearEnd && holiday.endDate >= yearStart)
    .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate));
}

function getComparisonOverlapData(comparisonSummaries, comparisonYear) {
  const dayMap = new Map();
  const yearStart = parseDate(`${comparisonYear}-01-01`);
  const yearEnd = parseDate(`${comparisonYear}-12-31`);
  const rangeStart = comparisonYear === TODAY.getFullYear() ? TODAY : yearStart;

  for (const summary of comparisonSummaries) {
    const holidays = summary.holidaysForYear || [];

    for (const holiday of holidays) {
      let currentDate = parseDate(holiday.startDate);
      const endDate = parseDate(holiday.endDate);

      if (currentDate < rangeStart) {
        currentDate = new Date(rangeStart);
      }

      const boundedEndDate = endDate > yearEnd ? yearEnd : endDate;

      while (currentDate <= boundedEndDate) {
        const dateKey = toDateKey(currentDate);
        const existing = dayMap.get(dateKey) || new Map();

        existing.set(summary.code, {
          code: summary.code,
          name: summary.name,
        });

        dayMap.set(dateKey, existing);
        currentDate = addDays(currentDate, 1);
      }
    }
  }

  const overlapDays = [...dayMap.entries()]
    .map(([dateKey, statesForDate]) => {
      return {
        dateKey,
        states: [...statesForDate.values()],
      };
    })
    .filter((item) => item.states.length >= 2)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const periods = [];

  for (const day of overlapDays) {
    const previous = periods[periods.length - 1];

    if (
      previous &&
      toDateKey(addDays(parseDate(previous.endDate), 1)) === day.dateKey &&
      previous.states.map((item) => item.code).sort().join(",") ===
        day.states.map((item) => item.code).sort().join(",")
    ) {
      previous.endDate = day.dateKey;
      continue;
    }

    periods.push({
      startDate: day.dateKey,
      endDate: day.dateKey,
      states: day.states,
    });
  }

  return {
    dayMap: Object.fromEntries(
      overlapDays.map((day) => {
        return [day.dateKey, day.states];
      })
    ),
    periods,
  };
}

function getOverlapMonthKeys(overlapDayMap) {
  return [...new Set(Object.keys(overlapDayMap).map((dateKey) => dateKey.slice(0, 7)))]
    .sort()
    .slice(0, 6);
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

  const schoolHoliday = holidays.find((holiday) => {
    return holiday.startDate <= key && key <= holiday.endDate;
  });

  if (schoolHoliday) {
    return schoolHoliday;
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

  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  useEffect(() => {
    setSelectedDayDetail(null);
  }, [selectedYear, customMonthKeys]);

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

                  const dayKey = toDateKey(date);
                  const holidayLabel = holiday ? getHolidayLabel(holiday) : "";
                  const freePeriodLabel =
                    isFreePeriodOnly && freePeriodHoliday
                      ? `Freie Zeit rund um ${getHolidayLabel(freePeriodHoliday)}`
                      : "";
                  const dayDetailLabel = holidayLabel || freePeriodLabel;

                  return (
                    <button
                      className={[
                        "calendar-day",
                        isSaturday ? "is-saturday" : "",
                        isSunday ? "is-sunday" : "",
                        isFreePeriodOnly ? "is-free-period" : "",
                        holiday ? "is-highlighted" : "",
                        tone ? `tone-${tone}` : "",
                        isToday ? "is-today" : "",
                        dayDetailLabel ? "has-day-detail" : "",
                        selectedDayDetail?.dateKey === dayKey ? "is-selected-detail" : "",
                      ].join(" ")}
                      key={dayKey}
                      type="button"
                      title={dayDetailLabel}
                      aria-label={
                        dayDetailLabel
                          ? `${formatDate(dayKey)}: ${dayDetailLabel}`
                          : formatDate(dayKey)
                      }
                      onClick={() => {
                        if (!dayDetailLabel) {
                          setSelectedDayDetail(null);
                          return;
                        }

                        setSelectedDayDetail({
                          dateKey: dayKey,
                          label: dayDetailLabel,
                        });
                      }}
                    >
                      <span>{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {selectedDayDetail && (
        <div className="calendar-day-detail" role="status" aria-live="polite">
          <strong>{formatDate(selectedDayDetail.dateKey)}</strong>
          <span>{selectedDayDetail.label}</span>
        </div>
      )}
    </div>
  );
}

function MobileActiveMonthCalendar({
  holidays,
  publicHolidays = [],
  selectedYear,
}) {
  const monthKeys = useMemo(() => getCalendarMonthKeys(selectedYear), [selectedYear]);

  const initialMonthIndex = useMemo(() => {
    const currentMonthKey = toDateKey(TODAY).slice(0, 7);
    const currentIndex = monthKeys.indexOf(currentMonthKey);
    return currentIndex >= 0 ? currentIndex : 0;
  }, [monthKeys]);

  const [activeMonthIndex, setActiveMonthIndex] = useState(initialMonthIndex);
  const pointerStartRef = useRef(null);

  useEffect(() => {
    setActiveMonthIndex(initialMonthIndex);
  }, [initialMonthIndex]);

  if (monthKeys.length === 0) {
    return null;
  }

  const safeActiveMonthIndex = Math.min(activeMonthIndex, monthKeys.length - 1);
  const activeMonthKey = monthKeys[safeActiveMonthIndex];
  const [yearText, monthText] = activeMonthKey.split("-");
  const activeMonthLabel = formatMonth(Number(yearText), Number(monthText) - 1);
  const isCurrentYear = selectedYear === TODAY.getFullYear();
  const isViewingCurrentMonth = isCurrentYear && safeActiveMonthIndex === initialMonthIndex;
  const currentYearUrl = `/?year=${TODAY.getFullYear()}#ferienkalender`;

  const goToCurrentMonth = () => {
    setActiveMonthIndex(initialMonthIndex);
  };

  const goToPreviousMonth = () => {
    setActiveMonthIndex((current) => Math.max(0, current - 1));
  };

  const goToNextMonth = () => {
    setActiveMonthIndex((current) => Math.min(monthKeys.length - 1, current + 1));
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (event) => {
    const pointerStart = pointerStartRef.current;

    if (!pointerStart) {
      return;
    }

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const elapsed = Date.now() - pointerStart.time;

    pointerStartRef.current = null;

    const isHorizontalSwipe =
      Math.abs(deltaX) >= 44 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.25 &&
      elapsed <= 1000;

    if (!isHorizontalSwipe) {
      return;
    }

    if (deltaX < 0) {
      goToNextMonth();
    } else {
      goToPreviousMonth();
    }
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
  };


  return (
    <section
      className="panel mobile-active-month-calendar"
      aria-labelledby="mobile-month-title"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="section-header mobile-month-header">
        <div>
          <p className="eyebrow">Heute im Blick</p>
          <h3 id="mobile-month-title">{isCurrentYear ? "Aktueller Monat" : "Monatsansicht"}</h3>
        </div>
        <span className="small-pill">Wischen oder tippen</span>
      </div>

      {!isCurrentYear && (
        <a
          className="current-year-link"
          href={currentYearUrl}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            localStorage.setItem(STORAGE_KEYS.year, String(TODAY.getFullYear()));
            window.location.assign(currentYearUrl);
          }}
        >
          Aktuelles Jahr anzeigen
        </a>
      )}

      {isCurrentYear && !isViewingCurrentMonth && (
        <button
          className="current-year-link"
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            goToCurrentMonth();
          }}
        >
          Aktueller Monat anzeigen
        </button>
      )}

      <div className="mobile-month-controls compact-month-controls" aria-label="Monat wechseln">
        <button
          className="month-nav-button"
          type="button"
          onClick={goToPreviousMonth}
          disabled={safeActiveMonthIndex === 0}
          aria-label="Vorheriger Monat"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div className="mobile-month-current" aria-live="polite">
          <strong>{activeMonthLabel}</strong>
          <span>{safeActiveMonthIndex + 1} von {monthKeys.length} · wischen</span>
        </div>

        <button
          className="month-nav-button"
          type="button"
          onClick={goToNextMonth}
          disabled={safeActiveMonthIndex === monthKeys.length - 1}
          aria-label="Nächster Monat"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <HolidayCalendar
        holidays={holidays}
        publicHolidays={publicHolidays}
        selectedYear={selectedYear}
        customMonthKeys={[activeMonthKey]}
        showLegend={false}
      />
    </section>
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
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
  const [isTravelSectionOpen, setIsTravelSectionOpen] = useState(false);
  const [isBridgeControlsOpen, setIsBridgeControlsOpen] = useState(false);
  const [isComparisonSectionOpen, setIsComparisonSectionOpen] = useState(false);
  const [isComparisonPickerOpen, setIsComparisonPickerOpen] = useState(false);
  const [comparisonCodes, setComparisonCodes] = useState(() => {
    try {
      const storedCodes = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.comparisonStates) || "[]"
      );

      return Array.isArray(storedCodes) ? storedCodes.slice(0, 4) : [];
    } catch {
      return [];
    }
  });
  const [comparisonDatasets, setComparisonDatasets] = useState({});
  const [activeOverlapMonthIndex, setActiveOverlapMonthIndex] = useState(0);
  const [showOverlapDetails, setShowOverlapDetails] = useState(false);
  const [travelCheckCode, setTravelCheckCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("state") || localStorage.getItem(STORAGE_KEYS.bundesland) || "BY";
  });
  const [travelStartDate, setTravelStartDate] = useState("");
  const [travelEndDate, setTravelEndDate] = useState("");
  const [travelDataset, setTravelDataset] = useState(null);
  const [travelPublicHolidayDataset, setTravelPublicHolidayDataset] = useState(null);
  const [travelDataLoading, setTravelDataLoading] = useState(false);
  const [bridgeDayCode, setBridgeDayCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("state") || localStorage.getItem(STORAGE_KEYS.bundesland) || "BY";
  });
  const [bridgeDayYear, setBridgeDayYear] = useState(() => {
    return Number(localStorage.getItem(STORAGE_KEYS.year)) || TODAY.getFullYear();
  });
  const [bridgeDayPublicHolidayDataset, setBridgeDayPublicHolidayDataset] = useState(null);
  const [bridgeDayLoading, setBridgeDayLoading] = useState(false);
  const [comparisonYear, setComparisonYear] = useState(() => {
    const storedYear = Number(localStorage.getItem(STORAGE_KEYS.comparisonYear));

    return Number.isFinite(storedYear) && storedYear > 0
      ? storedYear
      : TODAY.getFullYear();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bundesland, selectedCode);
  }, [selectedCode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.year, String(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    setComparisonCodes((currentCodes) => {
      const nextCodes = [
        selectedCode,
        ...currentCodes.filter((code) => code !== selectedCode),
      ].slice(0, 4);

      localStorage.setItem(STORAGE_KEYS.comparisonStates, JSON.stringify(nextCodes));
      return nextCodes;
    });
  }, [selectedCode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.comparisonStates, JSON.stringify(comparisonCodes));
  }, [comparisonCodes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.comparisonYear, String(comparisonYear));
  }, [comparisonYear]);
  useEffect(() => {
    if (window.location.hash !== "#ferienkalender") return;

    const scrollToCalendar = () => {
      document.getElementById("ferienkalender")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    window.setTimeout(scrollToCalendar, 0);
    window.setTimeout(scrollToCalendar, 250);
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
    if (!index?.datasets || comparisonCodes.length === 0) {
      setComparisonDatasets({});
      return;
    }

    let isCancelled = false;

    async function loadComparisonDatasets() {
      const entries = await Promise.all(
        comparisonCodes.map(async (code) => {
          const meta = index.datasets.find((item) => item.bundeslandCode === code);

          if (!meta?.jsonFile) {
            return [code, null];
          }

          try {
            const response = await fetch(dataUrl(`/data/holidays/${meta.jsonFile}`));

            if (!response.ok) {
              return [code, null];
            }

            return [code, await response.json()];
          } catch {
            return [code, null];
          }
        })
      );

      if (!isCancelled) {
        setComparisonDatasets(Object.fromEntries(entries));
      }
    }

    loadComparisonDatasets();

    return () => {
      isCancelled = true;
    };
  }, [index, comparisonCodes]);

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

  const bridgeDaySuggestions = useMemo(() => {
    return getBridgeDaySuggestions(
      bridgeDayPublicHolidayDataset?.holidays || [],
      bridgeDayYear,
    );
  }, [bridgeDayPublicHolidayDataset, bridgeDayYear]);

  useEffect(() => {
    let isCancelled = false;

    async function loadBridgeDayPublicHolidays() {
      setBridgeDayLoading(true);

      try {
        const indexResponse = await fetch(dataUrl("/data/public-holidays/index.json"));

        if (!indexResponse.ok) {
          throw new Error("Bridge day public holiday index could not be loaded");
        }

        const publicHolidayIndex = await indexResponse.json();
        const matchingDataset = publicHolidayIndex.datasets.find((item) => {
          return item.bundeslandCode === bridgeDayCode && item.year === bridgeDayYear;
        });

        if (!matchingDataset) {
          if (!isCancelled) {
            setBridgeDayPublicHolidayDataset(null);
          }
          return;
        }

        const datasetResponse = await fetch(
          dataUrl(`/data/public-holidays/${matchingDataset.jsonFile}`)
        );

        if (!datasetResponse.ok) {
          throw new Error("Bridge day public holiday data could not be loaded");
        }

        const data = await datasetResponse.json();

        if (!isCancelled) {
          setBridgeDayPublicHolidayDataset(data);
        }
      } catch {
        if (!isCancelled) {
          setBridgeDayPublicHolidayDataset(null);
        }
      } finally {
        if (!isCancelled) {
          setBridgeDayLoading(false);
        }
      }
    }

    loadBridgeDayPublicHolidays();

    return () => {
      isCancelled = true;
    };
  }, [bridgeDayCode, bridgeDayYear]);

  const travelCheckYear = travelStartDate
    ? Number(travelStartDate.slice(0, 4))
    : selectedYear;

  const travelCheckStates = useMemo(() => {
    const seenCodes = new Set();

    return (index?.datasets || [])
      .filter((item) => {
        if (seenCodes.has(item.bundeslandCode)) {
          return false;
        }

        seenCodes.add(item.bundeslandCode);
        return true;
      })
      .map((item) => {
        return {
          code: item.bundeslandCode,
          name: item.bundeslandName,
        };
      });
  }, [index]);

  const travelPeriodMatches = useMemo(() => {
    return getTravelPeriodMatches(
      travelStartDate,
      travelEndDate,
      travelDataset?.holidays || [],
      travelPublicHolidayDataset?.holidays || [],
    );
  }, [travelDataset, travelPublicHolidayDataset, travelStartDate, travelEndDate]);

  const hasTravelPeriodInput = Boolean(travelStartDate && travelEndDate);
  const isTravelPeriodInvalid = hasTravelPeriodInput && travelStartDate > travelEndDate;
  const hasTravelPeriodMatches =
    travelPeriodMatches.schoolHolidayMatches.length > 0 ||
    travelPeriodMatches.publicHolidayMatches.length > 0;

  useEffect(() => {
    let isCancelled = false;

    async function loadTravelCheckData() {
      if (!index || !Number.isFinite(travelCheckYear)) {
        setTravelDataset(null);
        setTravelPublicHolidayDataset(null);
        return;
      }

      setTravelDataLoading(true);

      try {
        const travelMeta = index.datasets.find((item) => {
          return item.bundeslandCode === travelCheckCode;
        });

        if (!travelMeta) {
          if (!isCancelled) {
            setTravelDataset(null);
            setTravelPublicHolidayDataset(null);
          }
          return;
        }

        const holidayResponse = await fetch(dataUrl(`/data/holidays/${travelMeta.jsonFile}`));

        if (!holidayResponse.ok) {
          throw new Error("Travel holiday data could not be loaded");
        }

        const holidayData = await holidayResponse.json();

        const publicHolidayIndexResponse = await fetch(dataUrl("/data/public-holidays/index.json"));

        if (!publicHolidayIndexResponse.ok) {
          throw new Error("Travel public holiday index could not be loaded");
        }

        const publicHolidayIndex = await publicHolidayIndexResponse.json();
        const publicHolidayMeta = publicHolidayIndex.datasets.find((item) => {
          return item.bundeslandCode === travelCheckCode && item.year === travelCheckYear;
        });

        let publicHolidayData = null;

        if (publicHolidayMeta) {
          const publicHolidayResponse = await fetch(
            dataUrl(`/data/public-holidays/${publicHolidayMeta.jsonFile}`)
          );

          if (publicHolidayResponse.ok) {
            publicHolidayData = await publicHolidayResponse.json();
          }
        }

        if (!isCancelled) {
          setTravelDataset(holidayData);
          setTravelPublicHolidayDataset(publicHolidayData);
        }
      } catch {
        if (!isCancelled) {
          setTravelDataset(null);
          setTravelPublicHolidayDataset(null);
        }
      } finally {
        if (!isCancelled) {
          setTravelDataLoading(false);
        }
      }
    }

    loadTravelCheckData();

    return () => {
      isCancelled = true;
    };
  }, [index, travelCheckCode, travelCheckYear]);

  const selectedStateDataset = index?.datasets?.find((item) => {
    return item.bundeslandCode === selectedCode;
  });

  const comparisonSummaries = useMemo(() => {
    return comparisonCodes
      .map((code) => {
        const meta = index?.datasets?.find((item) => item.bundeslandCode === code);
        const stateHolidays = comparisonDatasets[code]?.holidays || [];
        const holidaysForYear = getHolidaysForYear(stateHolidays, comparisonYear);

        if (!meta) {
          return null;
        }

        return {
          code,
          name: meta.bundeslandName,
          holidayCount: holidaysForYear.length,
          holidaysForYear,
        };
      })
      .filter(Boolean);
  }, [comparisonCodes, comparisonDatasets, comparisonYear, index]);

  const comparisonOverlapData = useMemo(() => {
    return getComparisonOverlapData(comparisonSummaries, comparisonYear);
  }, [comparisonSummaries, comparisonYear]);

  const comparisonOverlapPeriods = comparisonOverlapData.periods.slice(0, 6);
  const comparisonOverlapMonthKeys = useMemo(() => {
    return getOverlapMonthKeys(comparisonOverlapData.dayMap);
  }, [comparisonOverlapData]);

  const safeActiveOverlapMonthIndex =
    comparisonOverlapMonthKeys.length > 0
      ? Math.min(activeOverlapMonthIndex, comparisonOverlapMonthKeys.length - 1)
      : 0;
  const activeOverlapMonthKey = comparisonOverlapMonthKeys[safeActiveOverlapMonthIndex];

  useEffect(() => {
    setActiveOverlapMonthIndex(0);
    setShowOverlapDetails(false);
  }, [comparisonCodes, comparisonYear]);

  const toggleComparisonCode = (code) => {
    setComparisonCodes((currentCodes) => {
      if (currentCodes.includes(code)) {
        if (code === selectedCode) {
          return currentCodes;
        }

        return currentCodes.filter((item) => item !== code);
      }

      return [...currentCodes, code].slice(0, 4);
    });
  };

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

  const scrollToSection = (sectionId) => {
    if (sectionId === "reisezeit") {
      setIsTravelSectionOpen(true);
    }

    if (sectionId === "brueckentage") {
      setIsBridgeControlsOpen(true);
    }

    if (sectionId === "vergleich") {
      setIsComparisonSectionOpen(true);
    }

    const target = document.getElementById(sectionId);

    if (!target) {
      setIsSiteMenuOpen(false);
      return;
    }

    const offset = window.innerWidth >= 900 ? 96 : 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth",
    });

    setIsSiteMenuOpen(false);
  };

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
      <button
        className={`floating-site-menu-button ${isSiteMenuOpen ? "is-open" : ""}`}
        type="button"
        aria-expanded={isSiteMenuOpen}
        aria-controls="site-menu"
        onClick={() => setIsSiteMenuOpen((isOpen) => !isOpen)}
      >
        {isSiteMenuOpen ? "× Schließen" : "☰ Menü"}
      </button>

      <section className={`hero hero-${pattern}`}>
        <nav className="topbar">
          <a className="brand" href="/" aria-label="Schulferienklar Startseite">
            <span className="brand-mark">S</span>
            <span>Schulferienklar</span>
          </a>

          <div className="topbar-actions">
            <a className="badge" href="/datenquellen.html">
              Datenquellen &amp; Prüfung
            </a>
            <button
              className="site-menu-button"
              type="button"
              aria-expanded={isSiteMenuOpen}
              aria-controls="site-menu"
              onClick={() => setIsSiteMenuOpen((isOpen) => !isOpen)}
            >
              ☰ Menü
            </button>
          </div>
        </nav>

        {isSiteMenuOpen && (
          <>
            <button
              className="site-menu-backdrop"
              type="button"
              aria-label="Menü schließen"
              onClick={() => setIsSiteMenuOpen(false)}
            />
            <div className="site-menu" id="site-menu">
              <button type="button" onClick={() => scrollToSection("bundesland-auswahl")}>
                Bundesland wählen
              </button>
              <button type="button" onClick={() => scrollToSection("kalender")}>
                Kalender
              </button>
              <button type="button" onClick={() => scrollToSection("reisezeit")}>
                Reisezeit prüfen
              </button>
              <button type="button" onClick={() => scrollToSection("brueckentage")}>
                Brückentage
              </button>
              <button type="button" onClick={() => scrollToSection("vergleich")}>
                Vergleich
              </button>
              <button type="button" onClick={() => scrollToSection("bundeslaender")}>
                Bundesländer
              </button>
              <button type="button" onClick={() => scrollToSection("app-speichern")}>
                App speichern
              </button>
              <a
                className="site-menu-external-link"
                href="https://germanytravelchecker.com/"
                target="_blank"
                rel="noreferrer"
              >
                Germany Travel Checker ↗
              </a>
            </div>
          </>
        )}

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Schulferien in Deutschland</p>
            <h1>Schulferien auf einen Blick.</h1>
            <p className="hero-text">
              Ferien, Feiertage und zusammenhängende freie Tage für dein
              Bundesland – übersichtlich und kostenlos im Kalender.
            </p>

            <div className="selector-card" id="bundesland-auswahl">
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

            <div className="hero-actions">
              <button
                className="hero-primary-action"
                type="button"
                onClick={() => scrollToSection("kalender")}
              >
                Zum Ferienkalender
              </button>
              <a className="hero-source-link" href="/datenquellen.html">
                Datenquellen ansehen
              </a>
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

      <section className="content-grid" id="kalender">
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
              <div id="ferienkalender" className="calendar-anchor" aria-hidden="true" />
              <div className="desktop-calendar-stack">
                {shouldShowCurrentMonthPreview && (
                  <section className="current-month-preview" id="heute">
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
              </div>

              <MobileActiveMonthCalendar
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

      <section
        className={`panel travel-check-section mobile-disclosure ${
          isTravelSectionOpen ? "is-mobile-open" : ""
        }`}
        id="reisezeit"
      >
        <div className="section-heading mobile-disclosure-heading">
          <div>
            <p className="eyebrow">Reisezeit prüfen</p>
            <h2>Passt dein Reisezeitraum?</h2>
          </div>
          <button
            className="mobile-disclosure-toggle"
            type="button"
            aria-expanded={isTravelSectionOpen}
            aria-controls="reisezeit-inhalt"
            onClick={() => setIsTravelSectionOpen((isOpen) => !isOpen)}
          >
            {isTravelSectionOpen ? "Schließen" : "Reisezeit prüfen"}
          </button>
        </div>

        <p className="section-copy">
          Wähle ein Bundesland und deinen Reisezeitraum. Schulferienklar prüft
          die passenden Schulferien und Feiertage für das Jahr deines Startdatums.
        </p>

        <div className="mobile-disclosure-body" id="reisezeit-inhalt">
          <div className="travel-check-form">
          <label>
            <span>Bundesland</span>
            <select
              value={travelCheckCode}
              onChange={(event) => setTravelCheckCode(event.target.value)}
            >
              {travelCheckStates.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Startdatum</span>
            <input
              type="date"
              value={travelStartDate}
              onChange={(event) => setTravelStartDate(event.target.value)}
            />
            <small className="date-input-hint">Datum antippen und auswählen</small>
          </label>

          <label>
            <span>Enddatum</span>
            <input
              type="date"
              value={travelEndDate}
              onChange={(event) => setTravelEndDate(event.target.value)}
            />
            <small className="date-input-hint">Datum antippen und auswählen</small>
          </label>
        </div>

        {isTravelPeriodInvalid && (
          <p className="travel-check-message warning">
            Das Enddatum muss nach dem Startdatum liegen.
          </p>
        )}

        {travelDataLoading && hasTravelPeriodInput && !isTravelPeriodInvalid && (
          <p className="travel-check-message">Daten werden geladen …</p>
        )}

        {hasTravelPeriodInput && !isTravelPeriodInvalid && !travelDataLoading && (
          <div className={`travel-check-result ${hasTravelPeriodMatches ? "has-matches" : "quiet"}`}>
            <strong>
              {hasTravelPeriodMatches
                ? "Schulferien oder Feiertage im Zeitraum"
                : "Keine Schulferien oder Feiertage gefunden"}
            </strong>
            <p>
              {hasTravelPeriodMatches
                ? "In deinem Zeitraum gibt es Überschneidungen mit Schulferien oder gesetzlichen Feiertagen. Rechne je nach Region mit mehr Reiseverkehr, volleren Zügen oder abweichenden Öffnungszeiten."
                : "Für diesen Zeitraum sind im ausgewählten Bundesland keine Schulferien oder gesetzlichen Feiertage hinterlegt."}
            </p>
            {!hasTravelPeriodMatches && (
              <p className="travel-check-detail-link">
                Für eine detailliertere Reiseprüfung kannst du den{" "}
                <a href="https://germanytravelchecker.com/" target="_blank" rel="noreferrer">
                  Germany Travel Checker
                </a>{" "}
                nutzen.
              </p>
            )}

            {travelPeriodMatches.schoolHolidayMatches.length > 0 && (
              <div className="travel-check-match-group">
                <h3>Schulferien</h3>
                <ul>
                  {travelPeriodMatches.schoolHolidayMatches.map((holiday) => (
                    <li key={holiday.id}>
                      <strong>{getHolidayLabel(holiday)}</strong>
                      <span>{formatDate(holiday.startDate)} – {formatDate(holiday.endDate)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {travelPeriodMatches.publicHolidayMatches.length > 0 && (
              <div className="travel-check-match-group">
                <h3>Feiertage</h3>
                <ul>
                  {travelPeriodMatches.publicHolidayMatches.map((holiday) => (
                    <li key={holiday.id}>
                      <strong>{getPublicHolidayName(holiday)}</strong>
                      <span>{formatDate(holiday.date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        </div>
      </section>

      <section className="panel bridge-days-section" id="brueckentage">
        <div className="section-header bridge-days-header">
          <div>
            <p className="eyebrow">Brückentage</p>
            <h2>Mehr freie Zeit mit wenig Urlaub</h2>
          </div>
        </div>

        <p className="section-copy">
          Wähle Bundesland und Jahr, um passende Brückentage unabhängig vom Kalender zu prüfen.
        </p>

        <div className="bridge-mobile-summary">
          <span>
            {bridgeDayCode} · {bridgeDayYear}
          </span>
          <button
            type="button"
            aria-expanded={isBridgeControlsOpen}
            aria-controls="brueckentage-auswahl"
            onClick={() => setIsBridgeControlsOpen((isOpen) => !isOpen)}
          >
            {isBridgeControlsOpen ? "Auswahl schließen" : "Bundesland und Jahr ändern"}
          </button>
        </div>

        <div
          className={`bridge-controls-mobile ${isBridgeControlsOpen ? "is-mobile-open" : ""}`}
          id="brueckentage-auswahl"
        >
          <div className="bridge-day-controls">
          <label>
            <span>Bundesland</span>
            <select
              value={bridgeDayCode}
              onChange={(event) => setBridgeDayCode(event.target.value)}
            >
              {travelCheckStates.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Jahr</span>
            <select
              value={bridgeDayYear}
              onChange={(event) => setBridgeDayYear(Number(event.target.value))}
            >
              {availablePublicHolidayYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          </div>
        </div>

        {bridgeDayLoading && (
          <p className="travel-check-message">Brückentage werden geladen …</p>
        )}

        {!bridgeDayLoading && bridgeDaySuggestions.length > 0 ? (
          <>
            <div className="bridge-day-list">
              {bridgeDaySuggestions.map((item) => (
                <article className="bridge-day-card" key={item.id}>
                  <div>
                    <strong>{formatDate(item.bridgeDate)}</strong>
                    <span>
                      {item.direction === "vor dem Feiertag"
                        ? "vor Feiertag"
                        : "nach Feiertag"}
                    </span>
                  </div>
                  <p>
                    {item.vacationDays}{" "}
                    {item.vacationDays === 1 ? "Urlaubstag" : "Urlaubstage"} →{" "}
                    {item.freeDays} freie Tage
                  </p>
                  <small>
                    {item.holidayName} · frei{" "}
                    {formatCompactDateRange(item.freeStartDate, item.freeEndDate)}
                  </small>
                </article>
              ))}
            </div>
            <p className="bridge-day-swipe-hint">Seitlich wischen für weitere Brückentage.</p>
          </>
        ) : (
          <p className="bridge-day-empty">
            Für {bridgeDayYear} wurden keine passenden Brückentage mit wenigen
            Urlaubstagen gefunden.
          </p>
        )}
      </section>

      <section
        className={`comparison-section mobile-disclosure ${
          isComparisonSectionOpen ? "is-mobile-open" : ""
        }`}
        id="vergleich"
      >
        <div className="section-heading mobile-disclosure-heading">
          <div>
            <p className="eyebrow">Bundesländer vergleichen</p>
            <h2>Ferien in mehreren Bundesländern vergleichen</h2>
            <p>
              Wähle bis zu vier Bundesländer und sieh sofort, wann sich Ferien überschneiden.
            </p>
          </div>
          <button
            className="mobile-disclosure-toggle"
            type="button"
            aria-expanded={isComparisonSectionOpen}
            aria-controls="vergleich-inhalt"
            onClick={() => setIsComparisonSectionOpen((isOpen) => !isOpen)}
          >
            {isComparisonSectionOpen ? "Vergleich schließen" : "Vergleich öffnen"}
          </button>
        </div>

        <div className="mobile-disclosure-body" id="vergleich-inhalt">
          <div className="comparison-toolbar">
          <div className="comparison-selected-list" aria-label="Ausgewählte Bundesländer">
            {comparisonSummaries.map((item, index) => (
              <button
                className={`comparison-selected-pill comparison-color-${index % 4}`}
                key={item.code}
                type="button"
                onClick={() => toggleComparisonCode(item.code)}
                title={`${item.name} aus Vergleich entfernen`}
              >
                <span>{item.code}</span>
                {item.name}
                {item.code !== selectedCode && <strong aria-hidden="true">×</strong>}
              </button>
            ))}
          </div>

          <div className="comparison-add-wrap">
            <button
              className="comparison-add-button"
              type="button"
              onClick={() => setIsComparisonPickerOpen((isOpen) => !isOpen)}
            >
              {isComparisonPickerOpen
                ? "Auswahl schließen"
                : comparisonCodes.length >= 4
                  ? "Auswahl bearbeiten"
                  : "+ Bundesland hinzufügen"}
            </button>
            {comparisonCodes.length >= 4 && (
              <span className="comparison-limit-note">
                Maximal 4 Bundesländer gewählt
              </span>
            )}
          </div>

          <label className="comparison-year-select">
            <span>Vergleichsjahr</span>
            <select
              value={comparisonYear}
              onChange={(event) => setComparisonYear(Number(event.target.value))}
            >
              {availablePublicHolidayYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isComparisonPickerOpen && (
          <div className="comparison-picker" aria-label="Bundesländer für Vergleich auswählen">
            {(index?.datasets || []).map((item) => {
              const isSelected = comparisonCodes.includes(item.bundeslandCode);
              const selectedIndex = comparisonCodes.indexOf(item.bundeslandCode);
              const colorClass =
                selectedIndex >= 0 ? `comparison-color-${selectedIndex % 4}` : "";
              const isDisabled = !isSelected && comparisonCodes.length >= 4;

              return (
                <button
                  className={`comparison-chip ${isSelected ? "selected" : ""} ${colorClass}`}
                  disabled={isDisabled}
                  key={item.bundeslandCode}
                  onClick={() => toggleComparisonCode(item.bundeslandCode)}
                  type="button"
                >
                  <span>{item.bundeslandCode}</span>
                  <strong>{item.bundeslandName}</strong>
                </button>
              );
            })}
          </div>
        )}

        <div className="overlap-panel">
          <h3>Gemeinsame Ferienzeiträume</h3>
          <p>
            Markierte Tage zeigen Überschneidungen von mindestens zwei ausgewählten Bundesländern.
          </p>

          {activeOverlapMonthKey && (() => {
            const [yearValue, monthValue] = activeOverlapMonthKey.split("-").map(Number);
            const monthCells = buildMonthCells(yearValue, monthValue - 1);

            return (
              <div className="overlap-month-slider">
                <div className="overlap-month-controls">
                  <button
                    type="button"
                    disabled={safeActiveOverlapMonthIndex === 0}
                    onClick={() =>
                      setActiveOverlapMonthIndex((current) => Math.max(0, current - 1))
                    }
                    aria-label="Vorherigen Overlap-Monat anzeigen"
                  >
                    ‹
                  </button>

                  <div>
                    <strong>{formatMonth(yearValue, monthValue - 1)}</strong>
                    <span>
                      {safeActiveOverlapMonthIndex + 1} von {comparisonOverlapMonthKeys.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={safeActiveOverlapMonthIndex === comparisonOverlapMonthKeys.length - 1}
                    onClick={() =>
                      setActiveOverlapMonthIndex((current) =>
                        Math.min(comparisonOverlapMonthKeys.length - 1, current + 1)
                      )
                    }
                    aria-label="Nächsten Overlap-Monat anzeigen"
                  >
                    ›
                  </button>
                </div>

                <article className="overlap-calendar" key={activeOverlapMonthKey}>
                  <div className="overlap-weekdays">
                    {WEEKDAYS.map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className="overlap-days">
                    {monthCells.map((date, index) => {
                      if (!date) {
                        return <span className="overlap-day empty" key={`empty-${index}`} />;
                      }

                      const dateKey = toDateKey(date);
                      const states = comparisonOverlapData.dayMap[dateKey] || [];
                      const level = Math.min(states.length, 4);

                      return (
                        <span
                          className={`overlap-day ${level > 0 ? `level-${level}` : ""}`}
                          key={dateKey}
                          title={
                            states.length > 0
                              ? `${states.length} Bundesländer: ${states
                                  .map((item) => item.name)
                                  .join(", ")}`
                              : ""
                          }
                        >
                          <span>{date.getDate()}</span>
                          {states.length > 0 && <strong>{states.length}</strong>}
                        </span>
                      );
                    })}
                  </div>
                </article>
              </div>
            );
          })()}

          {comparisonOverlapPeriods.length > 0 ? (
            <div className="overlap-details">
              <button
                className="overlap-details-toggle"
                type="button"
                aria-expanded={showOverlapDetails}
                onClick={() => setShowOverlapDetails((isOpen) => !isOpen)}
              >
                {showOverlapDetails
                  ? "Details ausblenden"
                  : `${comparisonOverlapPeriods.length} gemeinsame Zeiträume anzeigen`}
              </button>

              {showOverlapDetails && (
                <div className="overlap-list">
              {comparisonOverlapPeriods.map((period) => (
                <article
                  className="overlap-card"
                  key={`${period.startDate}-${period.endDate}-${period.states
                    .map((item) => item.code)
                    .join("-")}`}
                >
                  <div className="overlap-card-header">
                    <span className="overlap-count">{period.states.length}</span>
                    <strong>
                      {period.states.length} Bundesländer gleichzeitig
                    </strong>
                  </div>
                  <p>{formatDate(period.startDate)} bis {formatDate(period.endDate)}</p>
                  <div className="overlap-state-list">
                    {period.states.map((item) => {
                      const selectedIndex = comparisonCodes.indexOf(item.code);
                      const colorClass =
                        selectedIndex >= 0 ? `comparison-color-${selectedIndex % 4}` : "";

                      return (
                        <span className={`overlap-state-pill ${colorClass}`} key={item.code}>
                          <small>{item.code}</small>
                          {item.name}
                        </span>
                      );
                    })}
                  </div>
                </article>
              ))}
                </div>
              )}
            </div>
          ) : (
            <p className="overlap-empty">
              Für die aktuelle Auswahl wurden keine gemeinsamen Ferienzeiträume
              gefunden.
            </p>
          )}
          </div>
        </div>
      </section>

      <section className="states-section" id="bundeslaender">
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

      <section className="panel install-guide" id="app-speichern" aria-labelledby="install-guide-title">
        <p className="eyebrow">Schneller wiederfinden</p>
        <h2 id="install-guide-title">Schulferienklar als App speichern</h2>
        <p>
          iPhone: Teilen → „Zum Home-Bildschirm“. Android/Computer:
          Browser-Menü → „App installieren“ oder „Zum Startbildschirm hinzufügen“.
        </p>
      </section>

      <footer className="footer site-footer">
        <p className="footer-copyright">© 2026 Joan — All rights reserved.</p>

        <nav className="footer-links" aria-label="Rechtliche und weitere Informationen">
          <a href="/datenquellen.html">Datenquellen</a>
          <a href="/datenschutz.html">Datenschutz</a>
          <a href="/impressum.html">Impressum</a>
          <a href="/support.html">Support</a>
          <a href="/ueber-uns.html">Über uns</a>
          <a className="footer-travel-link" href="/germany-travel-checker.html">Germany Travel Checker</a>
          <a href="/travel-germany-school-holidays.html">Travel planning</a>
        </nav>

        <p className="footer-credit">Designed &amp; developed by Joan.</p>
      </footer>
    </main>
  );
}
