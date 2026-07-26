export const EVENT_KIND = Object.freeze({
  SCHOOL_HOLIDAY: "school_holiday",
  STATE_SCHOOL_FREE_DAY: "state_school_free_day",
  PUBLIC_HOLIDAY: "public_holiday",
});

const LEGACY_STATE_SCHOOL_FREE_DAY = "school_free";

function eventTypeValues(event) {
  return [event?.kind, event?.category, event?.type].filter(Boolean);
}

export function isStateSchoolFreeDay(event) {
  const values = eventTypeValues(event);

  return (
    values.includes(EVENT_KIND.STATE_SCHOOL_FREE_DAY) ||
    values.includes(LEGACY_STATE_SCHOOL_FREE_DAY)
  );
}

export function isSchoolHolidayEvent(event) {
  return eventTypeValues(event).includes(EVENT_KIND.SCHOOL_HOLIDAY);
}

export function isPublicHolidayEvent(event) {
  return eventTypeValues(event).includes(EVENT_KIND.PUBLIC_HOLIDAY);
}

export function getSchoolEventCategoryLabel(event, locale = "de") {
  if (isStateSchoolFreeDay(event)) {
    return locale === "en" ? "School-free day" : "Unterrichtsfrei";
  }

  return locale === "en" ? "School holidays" : "Schulferien";
}
