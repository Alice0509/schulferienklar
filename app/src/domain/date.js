const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDateKey(value) {
  const match = DATE_KEY_PATTERN.exec(String(value));

  if (!match) {
    throw new Error(`Invalid date key: ${value}`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date key: ${value}`);
  }

  return date;
}

export function toDateKey(value) {
  const date = value instanceof Date ? value : parseDateKey(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(value, amount) {
  if (!Number.isInteger(amount)) {
    throw new Error(`Day amount must be an integer: ${amount}`);
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : parseDateKey(value);

  date.setDate(date.getDate() + amount);
  date.setHours(0, 0, 0, 0);

  return date;
}

export function addDaysToDateKey(dateKey, amount) {
  return toDateKey(addDays(dateKey, amount));
}

export function isWeekend(value) {
  const date = value instanceof Date ? value : parseDateKey(value);
  const weekday = date.getDay();

  return weekday === 0 || weekday === 6;
}

function toUtcDayNumber(value) {
  const date = value instanceof Date ? value : parseDateKey(value);

  return (
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY
  );
}

export function daysBetween(start, end) {
  return toUtcDayNumber(end) - toUtcDayNumber(start);
}

export function rangesOverlap(startA, endA, startB, endB) {
  const startAKey = toDateKey(startA);
  const endAKey = toDateKey(endA);
  const startBKey = toDateKey(startB);
  const endBKey = toDateKey(endB);

  return startAKey <= endBKey && endAKey >= startBKey;
}

export function formatBasicDate(dateKey) {
  return toDateKey(dateKey).replaceAll("-", "");
}
