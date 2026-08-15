import {
  addDays,
  isWeekend,
  parseDateKey,
  toDateKey,
} from "./date.js";

export function findCalendarPublicHolidayForDate(
  date,
  publicHolidays = [],
) {
  const dateKey = toDateKey(date);

  return publicHolidays.find((holiday) => {
    return holiday.date === dateKey;
  });
}

export function findPublicHolidayForDate(date, publicHolidays = []) {
  const dateKey = toDateKey(date);

  return publicHolidays.find((holiday) => {
    return (
      holiday.includeInDefaultCalendar === true &&
      holiday.date === dateKey
    );
  });
}

export function isDefaultFreeDay(date, publicHolidays = []) {
  return (
    isWeekend(date) ||
    Boolean(findPublicHolidayForDate(date, publicHolidays))
  );
}

export function getEffectiveFreePeriod(
  holiday,
  publicHolidays = [],
) {
  if (!holiday) {
    return null;
  }

  let start = parseDateKey(holiday.startDate);
  let end = parseDateKey(holiday.endDate);

  while (isDefaultFreeDay(addDays(start, -1), publicHolidays)) {
    start = addDays(start, -1);
  }

  while (isDefaultFreeDay(addDays(end, 1), publicHolidays)) {
    end = addDays(end, 1);
  }

  const startDate = toDateKey(start);
  const endDate = toDateKey(end);

  return {
    startDate,
    endDate,
    startsBeforeOfficialHoliday: startDate < holiday.startDate,
    endsAfterOfficialHoliday: endDate > holiday.endDate,
  };
}
