import {
  addDays,
  isWeekend,
  parseDateKey,
  toDateKey,
} from "./date.js";

function getPublicHolidayName(holiday) {
  return holiday?.name?.de || holiday?.name || "Feiertag";
}

export function getBridgeDaySuggestions(
  publicHolidays = [],
  selectedYear,
  today = new Date(),
) {
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const todayKey = toDateKey(today);

  const publicHolidayDates = new Set(
    publicHolidays
      .filter((holiday) => {
        return holiday.includeInDefaultCalendar === true;
      })
      .map((holiday) => holiday.date),
  );

  const isValidVacationDay = (date) => {
    const dateKey = toDateKey(date);

    return (
      !isWeekend(date) &&
      !publicHolidayDates.has(dateKey)
    );
  };

  return publicHolidays
    .filter((holiday) => {
      return (
        holiday.includeInDefaultCalendar === true &&
        holiday.date >= yearStart &&
        holiday.date <= yearEnd
      );
    })
    .flatMap((holiday) => {
      const holidayDate = parseDateKey(holiday.date);
      const weekday = holidayDate.getDay();
      const holidayName = getPublicHolidayName(holiday);
      const suggestions = [];

      if (weekday === 2 || weekday === 4) {
        const bridgeDate =
          weekday === 2
            ? addDays(holidayDate, -1)
            : addDays(holidayDate, 1);

        const bridgeDateKey = toDateKey(bridgeDate);

        if (isValidVacationDay(bridgeDate)) {
          const weekendStart =
            weekday === 2
              ? addDays(holidayDate, -3)
              : holidayDate;

          const weekendEnd =
            weekday === 2
              ? holidayDate
              : addDays(holidayDate, 3);

          suggestions.push({
            id: `${holiday.date}-${bridgeDateKey}`,
            holidayName,
            holidayDate: holiday.date,
            bridgeDate: bridgeDateKey,
            freeStartDate: toDateKey(weekendStart),
            freeEndDate: toDateKey(weekendEnd),
            vacationDays: 1,
            freeDays: 4,
            direction:
              weekday === 2
                ? "vor dem Feiertag"
                : "nach dem Feiertag",
          });
        }
      }

      if (weekday === 3) {
        const beforeVacationDays = [
          addDays(holidayDate, -2),
          addDays(holidayDate, -1),
        ];

        const afterVacationDays = [
          addDays(holidayDate, 1),
          addDays(holidayDate, 2),
        ];

        if (beforeVacationDays.every(isValidVacationDay)) {
          suggestions.push({
            id: `${holiday.date}-${beforeVacationDays
              .map(toDateKey)
              .join("-")}`,
            holidayName,
            holidayDate: holiday.date,
            bridgeDate: toDateKey(beforeVacationDays[0]),
            freeStartDate: toDateKey(
              addDays(holidayDate, -4),
            ),
            freeEndDate: holiday.date,
            vacationDays: 2,
            freeDays: 5,
            direction: "vor dem Feiertag",
          });
        }

        if (afterVacationDays.every(isValidVacationDay)) {
          suggestions.push({
            id: `${holiday.date}-${afterVacationDays
              .map(toDateKey)
              .join("-")}`,
            holidayName,
            holidayDate: holiday.date,
            bridgeDate: toDateKey(afterVacationDays[0]),
            freeStartDate: holiday.date,
            freeEndDate: toDateKey(
              addDays(holidayDate, 4),
            ),
            vacationDays: 2,
            freeDays: 5,
            direction: "nach dem Feiertag",
          });
        }
      }

      return suggestions;
    })
    .filter((item) => item.bridgeDate >= todayKey)
    .sort((a, b) => {
      return a.bridgeDate.localeCompare(b.bridgeDate);
    });
}
