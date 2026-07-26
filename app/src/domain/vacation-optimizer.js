import {
  addDaysToDateKey,
  daysBetween,
  isWeekend,
  rangesOverlap,
} from "./date.js";

function getPublicHolidayName(holiday) {
  if (typeof holiday?.name === "string") {
    return holiday.name;
  }

  return (
    holiday?.name?.de ||
    holiday?.name?.en ||
    "Feiertag"
  );
}

function normalizeBudget(value) {
  const budget = Number(value);

  if (
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > 30
  ) {
    throw new Error(
      `Vacation day budget must be an integer between 1 and 30: ${value}`,
    );
  }

  return budget;
}

function createPublicHolidayMap(
  publicHolidays,
  yearStart,
  yearEnd,
) {
  const holidayMap = new Map();

  for (const holiday of publicHolidays) {
    if (
      holiday.includeInDefaultCalendar !== true ||
      holiday.date < yearStart ||
      holiday.date > yearEnd
    ) {
      continue;
    }

    if (!holidayMap.has(holiday.date)) {
      holidayMap.set(holiday.date, []);
    }

    holidayMap.get(holiday.date).push({
      id: holiday.id,
      date: holiday.date,
      name: getPublicHolidayName(holiday),
    });
  }

  return holidayMap;
}

function createYearDates(year) {
  const dates = [];
  const yearEnd = `${year}-12-31`;

  for (
    let dateKey = `${year}-01-01`;
    dateKey <= yearEnd;
    dateKey = addDaysToDateKey(dateKey, 1)
  ) {
    dates.push(dateKey);
  }

  return dates;
}

function isNaturallyFreeDate(
  dateKey,
  publicHolidayMap,
) {
  return (
    isWeekend(dateKey) ||
    publicHolidayMap.has(dateKey)
  );
}

function candidateId(
  startDate,
  endDate,
  vacationDates,
) {
  return [
    startDate,
    endDate,
    vacationDates.join("_"),
  ].join("--");
}

function rankSuggestions(a, b) {
  return (
    b.freeDays - a.freeDays ||
    a.vacationDays - b.vacationDays ||
    b.publicHolidayCount -
      a.publicHolidayCount ||
    b.efficiency - a.efficiency ||
    a.startDate.localeCompare(b.startDate)
  );
}

function selectDistinctSuggestions(
  suggestions,
  limit,
) {
  const selected = [];

  for (const suggestion of suggestions) {
    const overlapsSelected =
      selected.some((existing) => {
        return rangesOverlap(
          suggestion.startDate,
          suggestion.endDate,
          existing.startDate,
          existing.endDate,
        );
      });

    if (overlapsSelected) {
      continue;
    }

    selected.push(suggestion);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

export function getVacationOptimizerSuggestions(
  publicHolidays = [],
  selectedYear,
  vacationDayBudget,
  {
    limit = 12,
    minStartDate = null,
  } = {},
) {
  const year = Number(selectedYear);
  const budget = normalizeBudget(
    vacationDayBudget,
  );

  if (!Number.isInteger(year)) {
    throw new Error(
      `Selected year must be an integer: ${selectedYear}`,
    );
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    throw new Error(
      `Suggestion limit must be a positive integer: ${limit}`,
    );
  }

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const dates = createYearDates(year);

  const publicHolidayMap =
    createPublicHolidayMap(
      publicHolidays,
      yearStart,
      yearEnd,
    );

  const suggestions = [];
  const seenIds = new Set();

  for (
    let startIndex = 0;
    startIndex < dates.length;
    startIndex += 1
  ) {
    const previousDate =
      startIndex > 0
        ? dates[startIndex - 1]
        : null;

    if (
      previousDate &&
      isNaturallyFreeDate(
        previousDate,
        publicHolidayMap,
      )
    ) {
      continue;
    }

    let vacationDays = 0;
    const vacationDates = [];

    for (
      let endIndex = startIndex;
      endIndex < dates.length;
      endIndex += 1
    ) {
      const dateKey = dates[endIndex];

      if (
        !isNaturallyFreeDate(
          dateKey,
          publicHolidayMap,
        )
      ) {
        vacationDays += 1;
        vacationDates.push(dateKey);
      }

      if (vacationDays > budget) {
        break;
      }

      if (vacationDays === 0) {
        continue;
      }

      const nextDate =
        endIndex < dates.length - 1
          ? dates[endIndex + 1]
          : null;

      if (
        nextDate &&
        isNaturallyFreeDate(
          nextDate,
          publicHolidayMap,
        )
      ) {
        continue;
      }

      const startDate = dates[startIndex];
      const endDate = dates[endIndex];

      if (
        minStartDate &&
        endDate < minStartDate
      ) {
        continue;
      }

      const freeDays =
        daysBetween(startDate, endDate) + 1;

      if (freeDays <= vacationDays) {
        continue;
      }

      const publicHolidayItems = dates
        .slice(startIndex, endIndex + 1)
        .flatMap((itemDate) => {
          return (
            publicHolidayMap.get(itemDate) ||
            []
          );
        });

      const id = candidateId(
        startDate,
        endDate,
        vacationDates,
      );

      if (seenIds.has(id)) {
        continue;
      }

      seenIds.add(id);

      suggestions.push({
        id,
        year,
        startDate,
        endDate,
        vacationDays,
        freeDays,
        naturalFreeDays:
          freeDays - vacationDays,
        gainDays:
          freeDays - vacationDays,
        efficiency: Number(
          (
            freeDays / vacationDays
          ).toFixed(2),
        ),
        vacationDates: [
          ...vacationDates,
        ],
        publicHolidayCount:
          publicHolidayItems.length,
        publicHolidays:
          publicHolidayItems,
      });
    }
  }

  return selectDistinctSuggestions(
    suggestions.sort(rankSuggestions),
    limit,
  );
}
