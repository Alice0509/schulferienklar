const DEFAULT_OPTIONS = Object.freeze({
  state: "BY",
  theme: "light",
  count: 3,
});

const SUPPORTED_THEMES = new Set([
  "light",
  "dark",
]);

const SCHOOL_EVENT_KINDS = new Set([
  "school_holiday",
  "state_school_free_day",
]);

const DAY_IN_MILLISECONDS =
  24 * 60 * 60 * 1000;

export function parseWidgetOptions(search = "") {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search);

  const state =
    (
      params.get("state") ||
      DEFAULT_OPTIONS.state
    )
      .trim()
      .toUpperCase();

  const requestedTheme =
    (
      params.get("theme") ||
      DEFAULT_OPTIONS.theme
    )
      .trim()
      .toLowerCase();

  const theme =
    SUPPORTED_THEMES.has(requestedTheme)
      ? requestedTheme
      : DEFAULT_OPTIONS.theme;

  const requestedCount = Number.parseInt(
    params.get("count") || "",
    10,
  );

  const count =
    Number.isInteger(requestedCount) &&
    requestedCount >= 1 &&
    requestedCount <= 3
      ? requestedCount
      : DEFAULT_OPTIONS.count;

  return {
    state,
    theme,
    count,
  };
}

export function getLocalDateKey(
  date = new Date(),
) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] =
    String(dateKey)
      .split("-")
      .map(Number);

  return new Date(
    Date.UTC(year, month - 1, day),
  );
}

function toDateKey(date) {
  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getUTCDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey);

  date.setUTCDate(
    date.getUTCDate() + amount,
  );

  return toDateKey(date);
}

function isWeekend(dateKey) {
  const day =
    parseDateKey(dateKey).getUTCDay();

  return day === 0 || day === 6;
}

export function daysUntil(
  startDate,
  todayDate,
) {
  const start = parseDateKey(startDate);
  const today = parseDateKey(todayDate);

  return Math.round(
    (
      start.getTime() -
      today.getTime()
    ) / DAY_IN_MILLISECONDS,
  );
}

export function getCountdownLabel(
  event,
  todayDate,
) {
  if (
    event.startDate <= todayDate &&
    event.endDate >= todayDate
  ) {
    return "Läuft gerade";
  }

  const remainingDays = daysUntil(
    event.startDate,
    todayDate,
  );

  if (remainingDays === 0) {
    return "Beginnt heute";
  }

  if (remainingDays === 1) {
    return "Beginnt morgen";
  }

  return `Noch ${remainingDays} Tage`;
}

export function selectUpcomingSchoolEvents(
  documents,
  todayDate,
  count = 3,
) {
  const uniqueEvents = new Map();

  for (const document of documents || []) {
    for (const event of document?.events || []) {
      if (
        !SCHOOL_EVENT_KINDS.has(event.kind) ||
        event.includeInDefaultCalendar === false ||
        event.endDate < todayDate
      ) {
        continue;
      }

      const key = [
        event.id,
        event.startDate,
        event.endDate,
      ].join("|");

      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(key, event);
      }
    }
  }

  return [...uniqueEvents.values()]
    .sort((a, b) => {
      return (
        a.startDate.localeCompare(
          b.startDate,
        ) ||
        a.endDate.localeCompare(
          b.endDate,
        ) ||
        String(a.id).localeCompare(
          String(b.id),
        )
      );
    })
    .slice(0, count);
}

export function calculateEffectivePeriod(
  event,
  publicHolidayEvents = [],
) {
  const publicHolidayDates = new Set(
    publicHolidayEvents
      .filter((holiday) => {
        return (
          holiday.kind ===
            "public_holiday" &&
          holiday
            .includeInDefaultCalendar ===
            true
        );
      })
      .map((holiday) => {
        return holiday.startDate;
      }),
  );

  const isFreeDay = (dateKey) => {
    return (
      isWeekend(dateKey) ||
      publicHolidayDates.has(dateKey)
    );
  };

  let startDate = event.startDate;
  let endDate = event.endDate;

  while (
    isFreeDay(
      addDays(startDate, -1),
    )
  ) {
    startDate = addDays(
      startDate,
      -1,
    );
  }

  while (
    isFreeDay(
      addDays(endDate, 1),
    )
  ) {
    endDate = addDays(
      endDate,
      1,
    );
  }

  return {
    startDate,
    endDate,
    differsFromOfficial:
      startDate !== event.startDate ||
      endDate !== event.endDate,
  };
}

export function formatDateRange(
  startDate,
  endDate,
) {
  const [
    startYear,
    startMonth,
    startDay,
  ] = startDate.split("-");

  const [
    endYear,
    endMonth,
    endDay,
  ] = endDate.split("-");

  if (
    startYear === endYear &&
    startMonth === endMonth
  ) {
    return (
      `${startDay}.–` +
      `${endDay}.${endMonth}.${endYear}`
    );
  }

  if (startYear === endYear) {
    return (
      `${startDay}.${startMonth}.–` +
      `${endDay}.${endMonth}.${endYear}`
    );
  }

  return (
    `${startDay}.${startMonth}.${startYear}–` +
    `${endDay}.${endMonth}.${endYear}`
  );
}
