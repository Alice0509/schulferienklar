import {
  EVENT_KIND,
  isStateSchoolFreeDay,
} from "./event-types.js";
import { getHolidaysForYear } from "./travel-check.js";

export const API_VERSION = "v1";

function normalizeName(name) {
  if (typeof name === "string") {
    return {
      de: name,
      en: null,
    };
  }

  return {
    de: name?.de || null,
    en: name?.en || null,
  };
}

function normalizeSource(event, dataset) {
  const datasetSource = dataset?.sources?.[0] || {};

  return {
    name:
      event?.sourceName ||
      datasetSource.sourceName ||
      datasetSource.name ||
      null,
    url:
      event?.sourceUrl ||
      datasetSource.sourceUrl ||
      datasetSource.url ||
      null,
    lastCheckedAt:
      event?.lastCheckedAt ||
      datasetSource.lastCheckedAt ||
      null,
  };
}

function normalizeState(state, event = {}) {
  return {
    code:
      event.bundeslandCode ||
      state?.code ||
      null,
    name:
      event.bundeslandName ||
      state?.name ||
      null,
  };
}

export function normalizeSchoolHolidayEvent(
  event,
  {
    state,
    dataset,
  } = {},
) {
  const kind = isStateSchoolFreeDay(event)
    ? EVENT_KIND.STATE_SCHOOL_FREE_DAY
    : EVENT_KIND.SCHOOL_HOLIDAY;

  const normalizedState = normalizeState(state, event);

  return {
    id: event.id,
    kind,
    category: event.category || kind,
    type: event.type || kind,
    name: normalizeName(event.name),
    startDate: event.startDate,
    endDate: event.endDate,
    stateCode: normalizedState.code,
    stateName: normalizedState.name,
    schoolYear: event.schoolYear || null,
    scope: null,
    status: event.status || null,
    includeInDefaultCalendar:
      event.includeInDefaultCalendar !== false,
    source: normalizeSource(event, dataset),
  };
}

export function normalizePublicHolidayEvent(
  event,
  {
    state,
    dataset,
  } = {},
) {
  const normalizedState = normalizeState(state, event);

  return {
    id: event.id,
    kind: EVENT_KIND.PUBLIC_HOLIDAY,
    category: EVENT_KIND.PUBLIC_HOLIDAY,
    type: event.type || EVENT_KIND.PUBLIC_HOLIDAY,
    name: normalizeName(event.name),
    startDate: event.date,
    endDate: event.date,
    stateCode: normalizedState.code,
    stateName: normalizedState.name,
    schoolYear: null,
    scope: event.scope || null,
    status: event.status || null,
    includeInDefaultCalendar:
      event.includeInDefaultCalendar === true,
    source: normalizeSource(event, dataset),
  };
}

export function sortApiEvents(events = []) {
  return [...events].sort((a, b) => {
    return (
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.kind.localeCompare(b.kind) ||
      String(a.id).localeCompare(String(b.id))
    );
  });
}

function createDocumentBase({
  resource,
  state,
  year,
  generatedAt,
  datasetVersion,
  events,
}) {
  return {
    apiVersion: API_VERSION,
    resource,
    state: {
      code: state.code,
      name: state.name,
    },
    year: Number(year),
    generatedAt: generatedAt || null,
    datasetVersion: datasetVersion || null,
    eventCount: events.length,
    events,
  };
}

export function buildSchoolHolidayDocument({
  state,
  year,
  dataset,
  generatedAt,
}) {
  const sourceEvents =
    dataset?.holidays ||
    dataset?.events ||
    [];

  const events = getHolidaysForYear(
    sourceEvents,
    Number(year),
  ).map((event) => {
    return normalizeSchoolHolidayEvent(event, {
      state,
      dataset,
    });
  });

  return createDocumentBase({
    resource: "school-holidays",
    state,
    year,
    generatedAt,
    datasetVersion: dataset?.version,
    events: sortApiEvents(events),
  });
}

export function buildPublicHolidayDocument({
  state,
  year,
  dataset,
  generatedAt,
}) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const sourceEvents =
    dataset?.holidays ||
    dataset?.events ||
    [];

  const events = sourceEvents
    .filter((event) => {
      return (
        event.date >= yearStart &&
        event.date <= yearEnd
      );
    })
    .map((event) => {
      return normalizePublicHolidayEvent(event, {
        state,
        dataset,
      });
    });

  return createDocumentBase({
    resource: "public-holidays",
    state,
    year,
    generatedAt,
    datasetVersion: dataset?.version,
    events: sortApiEvents(events),
  });
}

export function buildCalendarDocument({
  state,
  year,
  schoolDocument,
  publicDocument,
  generatedAt,
}) {
  const events = sortApiEvents([
    ...schoolDocument.events,
    ...publicDocument.events,
  ]);

  return {
    apiVersion: API_VERSION,
    resource: "calendar",
    state: {
      code: state.code,
      name: state.name,
    },
    year: Number(year),
    generatedAt: generatedAt || null,
    datasetVersions: {
      schoolHolidays:
        schoolDocument.datasetVersion,
      publicHolidays:
        publicDocument.datasetVersion,
    },
    eventCount: events.length,
    events,
  };
}

export function buildStatesDocument({
  states,
  generatedAt,
}) {
  const normalizedStates = states
    .map((state) => {
      const years = [...state.years]
        .map(Number)
        .sort((a, b) => a - b);

      return {
        code: state.code,
        name: state.name,
        years,
        endpoints: {
          schoolHolidays:
            `/api/v1/holidays/${state.code}/{year}.json`,
          publicHolidays:
            `/api/v1/public-holidays/${state.code}/{year}.json`,
          calendar:
            `/api/v1/calendar/${state.code}/{year}.json`,
        },
      };
    })
    .sort((a, b) => {
      return a.code.localeCompare(b.code);
    });

  return {
    apiVersion: API_VERSION,
    resource: "states",
    generatedAt: generatedAt || null,
    stateCount: normalizedStates.length,
    states: normalizedStates,
  };
}

export function buildApiIndexDocument({
  statesDocument,
  generatedAt,
}) {
  const years = [
    ...new Set(
      statesDocument.states.flatMap(
        (state) => state.years,
      ),
    ),
  ].sort((a, b) => a - b);

  const calendarCount =
    statesDocument.states.reduce(
      (total, state) => {
        return total + state.years.length;
      },
      0,
    );

  return {
    apiVersion: API_VERSION,
    resource: "api-index",
    generatedAt: generatedAt || null,
    stateCount: statesDocument.stateCount,
    yearCount: years.length,
    calendarCount,
    years,
    endpoints: {
      states: "/api/v1/states.json",
      schoolHolidays:
        "/api/v1/holidays/{state}/{year}.json",
      publicHolidays:
        "/api/v1/public-holidays/{state}/{year}.json",
      calendar:
        "/api/v1/calendar/{state}/{year}.json",
    },
  };
}
