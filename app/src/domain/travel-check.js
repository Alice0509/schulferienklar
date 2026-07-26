import {
  parseDateKey,
  rangesOverlap,
} from "./date.js";

export function getTravelPeriodMatches(
  startDate,
  endDate,
  holidays = [],
  publicHolidays = [],
) {
  if (!startDate || !endDate || startDate > endDate) {
    return {
      schoolHolidayMatches: [],
      publicHolidayMatches: [],
    };
  }

  const schoolHolidayMatches = holidays.filter((holiday) => {
    return rangesOverlap(
      startDate,
      endDate,
      holiday.startDate,
      holiday.endDate,
    );
  });

  const publicHolidayMatches = publicHolidays.filter((holiday) => {
    return (
      holiday.includeInDefaultCalendar === true &&
      rangesOverlap(
        startDate,
        endDate,
        holiday.date,
        holiday.date,
      )
    );
  });

  return {
    schoolHolidayMatches,
    publicHolidayMatches,
  };
}

export function getHolidaysForYear(holidays = [], year) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return holidays
    .filter((holiday) => {
      return (
        holiday.startDate <= yearEnd &&
        holiday.endDate >= yearStart
      );
    })
    .sort((a, b) => {
      return (
        parseDateKey(a.startDate) -
        parseDateKey(b.startDate)
      );
    });
}
