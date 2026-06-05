export function parseDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== "string") {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

export function addDays(date, days) {
  const localDate = startOfLocalDay(date);

  if (!localDate || !Number.isFinite(days)) {
    return null;
  }

  localDate.setDate(localDate.getDate() + days);
  return localDate;
}

export function isSunday(date) {
  const localDate = startOfLocalDay(date);
  return localDate ? localDate.getDay() === 0 : false;
}

export function isDateInRange(dateKey, startDateKey, endDateKey) {
  if (!dateKey || !startDateKey || !endDateKey) {
    return false;
  }

  return startDateKey <= dateKey && dateKey <= endDateKey;
}

export function findPublicHolidayForDate(dateKey, publicHolidays = []) {
  return (
    publicHolidays.find(
      (holiday) =>
        holiday.includeInDefaultCalendar !== false && holiday.date === dateKey,
    ) || null
  );
}

export function findSchoolHolidayForDate(dateKey, schoolHolidays = []) {
  return (
    schoolHolidays.find((holiday) =>
      isDateInRange(dateKey, holiday.startDate, holiday.endDate),
    ) || null
  );
}

export function getCheckTodayRiskLevel({
  isSundayDate = false,
  publicHoliday = null,
  schoolHoliday = null,
} = {}) {
  if (publicHoliday && schoolHoliday) {
    return "high";
  }

  if (publicHoliday) {
    return "high";
  }

  if (isSundayDate || schoolHoliday) {
    return "medium";
  }

  return "low";
}

export function getCheckTodayStatus({
  date,
  publicHolidays = [],
  schoolHolidays = [],
} = {}) {
  const localDate = startOfLocalDay(date);

  if (!localDate) {
    return null;
  }

  const dateKey = formatDateKey(localDate);
  const publicHoliday = findPublicHolidayForDate(dateKey, publicHolidays);
  const schoolHoliday = findSchoolHolidayForDate(dateKey, schoolHolidays);
  const sunday = isSunday(localDate);
  const riskLevel = getCheckTodayRiskLevel({
    isSundayDate: sunday,
    publicHoliday,
    schoolHoliday,
  });

  return {
    date: localDate,
    dateKey,
    weekday: localDate.getDay(),
    isSunday: sunday,
    publicHoliday,
    schoolHoliday,
    riskLevel,
  };
}
