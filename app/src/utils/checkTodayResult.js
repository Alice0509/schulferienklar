import { findTravelCityById } from "../data/travelCities.js";
import { getCheckTodayStatus } from "./checkToday.js";
import {
  NEED_OPTIONS,
  getCheckTodayDisclaimer,
  getCheckTodaySummary,
  getCheckTodayTitle,
  getNeedGuidance,
} from "./checkTodayGuidance.js";

export function buildCheckTodayResult({
  cityId,
  date,
  publicHolidays = [],
  schoolHolidays = [],
  selectedNeedIds = [],
} = {}) {
  const city = findTravelCityById(cityId);
  const status = getCheckTodayStatus({
    date,
    publicHolidays,
    schoolHolidays,
  });

  if (!city || !status) {
    return null;
  }

  const guidance = selectedNeedIds
    .map((needId) => getNeedGuidance(needId))
    .filter(Boolean);

  const title = getCheckTodayTitle({
    cityName: city.name,
    isSunday: status.isSunday,
    publicHoliday: status.publicHoliday,
  });

  const summary = getCheckTodaySummary({
    cityName: city.name,
    bundeslandName: city.englishStateName || city.bundeslandName,
    isSunday: status.isSunday,
    publicHoliday: status.publicHoliday,
    schoolHoliday: status.schoolHoliday,
  });

  return {
    city,
    status,
    title,
    summary,
    riskLevel: status.riskLevel,
    selectedNeeds: selectedNeedIds,
    guidance,
    availableNeeds: NEED_OPTIONS,
    disclaimer: getCheckTodayDisclaimer(),
  };
}

export function buildDefaultCheckTodayResult({
  cityId = "berlin",
  date = new Date(),
  publicHolidays = [],
  schoolHolidays = [],
} = {}) {
  return buildCheckTodayResult({
    cityId,
    date,
    publicHolidays,
    schoolHolidays,
    selectedNeedIds: ["water", "groceries"],
  });
}
