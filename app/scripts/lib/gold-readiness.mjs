import { nodeHolidayRepository } from "./node-data-repository.mjs";
import { STATES } from "./site-config.mjs";
import {
  evaluateGoldReadiness as evaluateReadiness,
} from "../../src/domain/school-holiday-coverage.js";

export {
  categorizeGoldReadinessBlocker,
  normalizeGoldReadinessYear,
  schoolYearLabel,
} from "../../src/domain/school-holiday-coverage.js";

export function evaluateGoldReadiness(
  yearInput,
  { repository = nodeHolidayRepository, states = STATES } = {},
) {
  return evaluateReadiness(yearInput, { repository, states });
}
