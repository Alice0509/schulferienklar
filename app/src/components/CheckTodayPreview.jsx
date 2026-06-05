import { useEffect, useMemo, useState } from "react";
import { TRAVEL_CITIES } from "../data/travelCities.js";
import { formatDateKey, parseDateKey } from "../utils/checkToday.js";
import { buildCheckTodayResult } from "../utils/checkTodayResult.js";

const DEFAULT_NEEDS = ["water", "groceries"];

function getTodayDateKey() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateKey(today);
}

function getDataUrl(baseUrl, path) {
  return `${baseUrl}${path.replace(/^\//, "")}`;
}

function getPublicHolidayName(publicHoliday) {
  if (!publicHoliday) {
    return "No statewide public holiday found";
  }

  return publicHoliday.name?.en || publicHoliday.name?.de || publicHoliday.name || "Public holiday";
}

function getSchoolHolidayName(schoolHoliday) {
  if (!schoolHoliday) {
    return "No school holiday period found";
  }

  return schoolHoliday.name?.en || schoolHoliday.name?.de || schoolHoliday.name || "School holiday period";
}

export default function CheckTodayPreview({ baseUrl = "/" }) {
  const [cityId, setCityId] = useState("berlin");
  const [dateKey, setDateKey] = useState(getTodayDateKey);
  const [selectedNeedIds, setSelectedNeedIds] = useState(DEFAULT_NEEDS);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [schoolHolidays, setSchoolHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCity = TRAVEL_CITIES.find((city) => city.id === cityId) || TRAVEL_CITIES[0];
  const selectedDate = parseDateKey(dateKey);
  const selectedYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();

  useEffect(() => {
    let isActive = true;

    async function loadPreviewData() {
      if (!selectedCity || !selectedYear) {
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const [holidayIndexResponse, publicHolidayIndexResponse] = await Promise.all([
          fetch(getDataUrl(baseUrl, "/data/holidays/index.json")),
          fetch(getDataUrl(baseUrl, "/data/public-holidays/index.json")),
        ]);

        if (!holidayIndexResponse.ok) {
          throw new Error("School holiday index could not be loaded.");
        }

        if (!publicHolidayIndexResponse.ok) {
          throw new Error("Public holiday index could not be loaded.");
        }

        const holidayIndex = await holidayIndexResponse.json();
        const publicHolidayIndex = await publicHolidayIndexResponse.json();

        const schoolDataset = holidayIndex.datasets?.find(
          (dataset) => dataset.bundeslandCode === selectedCity.bundeslandCode,
        );

        const publicHolidayDataset = publicHolidayIndex.datasets?.find(
          (dataset) =>
            dataset.bundeslandCode === selectedCity.bundeslandCode &&
            dataset.year === selectedYear,
        );

        const [schoolHolidayData, publicHolidayData] = await Promise.all([
          schoolDataset
            ? fetch(getDataUrl(baseUrl, `/data/holidays/${schoolDataset.jsonFile}`)).then((response) => {
                if (!response.ok) {
                  throw new Error("School holiday data could not be loaded.");
                }
                return response.json();
              })
            : Promise.resolve({ holidays: [] }),
          publicHolidayDataset
            ? fetch(getDataUrl(baseUrl, `/data/public-holidays/${publicHolidayDataset.jsonFile}`)).then(
                (response) => {
                  if (!response.ok) {
                    throw new Error("Public holiday data could not be loaded.");
                  }
                  return response.json();
                },
              )
            : Promise.resolve({ holidays: [] }),
        ]);

        if (!isActive) {
          return;
        }

        setSchoolHolidays(schoolHolidayData.holidays || []);
        setPublicHolidays(publicHolidayData.holidays || []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSchoolHolidays([]);
        setPublicHolidays([]);
        setErrorMessage(error.message || "Check Today data could not be loaded.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadPreviewData();

    return () => {
      isActive = false;
    };
  }, [baseUrl, selectedCity, selectedYear]);

  const result = useMemo(() => {
    if (!selectedDate) {
      return null;
    }

    return buildCheckTodayResult({
      cityId,
      date: selectedDate,
      publicHolidays,
      schoolHolidays,
      selectedNeedIds,
    });
  }, [cityId, publicHolidays, schoolHolidays, selectedDate, selectedNeedIds]);

  function toggleNeed(needId) {
    setSelectedNeedIds((current) => {
      if (current.includes(needId)) {
        return current.filter((id) => id !== needId);
      }

      return [...current, needId];
    });
  }

  if (!result) {
    return null;
  }

  return (
    <section className="panel check-today-preview" aria-labelledby="check-today-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Germany Travel Checker</p>
          <h2 id="check-today-title">Check today before you rely on shops.</h2>
        </div>
        <span className={`risk-pill risk-${result.riskLevel}`}>{result.riskLevel} risk</span>
      </div>

      <p className="check-today-intro">
        A small rule-based preview for travelers in Germany. It checks the city,
        date, Sunday status, public holidays and school holiday periods. It does
        not use AI or exact shop opening-hour data.
      </p>

      <div className="check-today-controls">
        <label>
          <span>City</span>
          <select value={cityId} onChange={(event) => setCityId(event.target.value)}>
            {TRAVEL_CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Date</span>
          <input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
        </label>
      </div>

      <div className="need-picker" aria-label="What do you need?">
        {result.availableNeeds.map((need) => (
          <button
            className={selectedNeedIds.includes(need.id) ? "selected" : ""}
            key={need.id}
            type="button"
            onClick={() => toggleNeed(need.id)}
          >
            {need.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="skeleton">Check Today data is loading…</p>
      ) : (
        <div className="check-result-card">
          <h3>{result.title}</h3>
          <p>{result.summary}</p>

          <div className="check-status-grid">
            <div>
              <strong>Federal state</strong>
              <span>
                {result.city.englishStateName || result.city.bundeslandName} ({result.city.bundeslandCode})
              </span>
            </div>
            <div>
              <strong>Sunday</strong>
              <span>{result.status.isSunday ? "Yes" : "No"}</span>
            </div>
            <div>
              <strong>Public holiday</strong>
              <span>{getPublicHolidayName(result.status.publicHoliday)}</span>
            </div>
            <div>
              <strong>School holiday</strong>
              <span>{getSchoolHolidayName(result.status.schoolHoliday)}</span>
            </div>
          </div>

          {result.guidance.length > 0 && (
            <div className="guidance-list">
              {result.guidance.map((item) => (
                <article key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          )}

          <p className="check-disclaimer">{result.disclaimer}</p>
        </div>
      )}

      {errorMessage && <p className="error">{errorMessage}</p>}
    </section>
  );
}
