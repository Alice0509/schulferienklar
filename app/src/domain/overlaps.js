import {
  addDays,
  parseDateKey,
  toDateKey,
} from "./date.js";

function normalizeDay(value) {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : parseDateKey(value);

  date.setHours(0, 0, 0, 0);

  return date;
}

function getStateSignature(states) {
  return states
    .map((state) => state.code)
    .sort()
    .join(",");
}

export function getComparisonOverlapData(
  comparisonSummaries = [],
  comparisonYear,
  today = new Date(),
) {
  const year = Number(comparisonYear);
  const dayMap = new Map();
  const todayDate = normalizeDay(today);
  const yearStart = parseDateKey(`${year}-01-01`);
  const yearEnd = parseDateKey(`${year}-12-31`);

  const rangeStart =
    year === todayDate.getFullYear()
      ? todayDate
      : yearStart;

  for (const summary of comparisonSummaries) {
    const holidays = summary.holidaysForYear || [];

    for (const holiday of holidays) {
      let currentDate = parseDateKey(holiday.startDate);
      const holidayEnd = parseDateKey(holiday.endDate);

      if (currentDate < rangeStart) {
        currentDate = new Date(rangeStart.getTime());
      }

      const boundedEndDate =
        holidayEnd > yearEnd ? yearEnd : holidayEnd;

      while (currentDate <= boundedEndDate) {
        const dateKey = toDateKey(currentDate);
        const statesForDate =
          dayMap.get(dateKey) || new Map();

        statesForDate.set(summary.code, {
          code: summary.code,
          name: summary.name,
        });

        dayMap.set(dateKey, statesForDate);
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
    .sort((a, b) => {
      return a.dateKey.localeCompare(b.dateKey);
    });

  const periods = [];

  for (const day of overlapDays) {
    const previous = periods[periods.length - 1];

    const isNextDay =
      previous &&
      toDateKey(addDays(previous.endDate, 1)) ===
        day.dateKey;

    const hasSameStates =
      previous &&
      getStateSignature(previous.states) ===
        getStateSignature(day.states);

    if (isNextDay && hasSameStates) {
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
      }),
    ),
    periods,
  };
}

export function getOverlapMonthKeys(overlapDayMap = {}) {
  return [
    ...new Set(
      Object.keys(overlapDayMap).map((dateKey) => {
        return dateKey.slice(0, 7);
      }),
    ),
  ]
    .sort()
    .slice(0, 6);
}
