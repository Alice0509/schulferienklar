// State-aware, strictly date-scoped Klaree moments.
// Public holiday claims are permitted only when the matching state's current-year
// verified, statewide source data confirms the statutory holiday.
const HIGHLIGHTED_IDS = new Set([
  "new-year", "epiphany", "international-womens-day", "labour-day",
  "german-unity", "reformation-day", "all-saints", "repentance-day",
]);

function localDateKey(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

const ordinal = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return Number.isFinite(Date.UTC(y, m - 1, d)) ? Date.UTC(y, m - 1, d) / 86400000 : null;
};

const content = {
  de: {
    christmas: {
      title: "Frohe Weihnachten!",
      kicker: "Klarees Weihnachtsgruß",
      hint: "Klarees Gruß lesen",
      message: "Klaree wünscht dir eine schöne, ruhige Weihnachtszeit. Danke, dass du Schulferienklar besuchst!",
      alt: "Klaree mit rotem Winterumhang neben einem Weihnachtsbaum",
    },
    easter: {
      title: "Eine kleine Osterüberraschung",
      kicker: "Klarees Ostergruß",
      hint: "Klarees Gruß lesen",
      message: "Frohe Ostern! Klaree hat schon wieder ein Leckerli versteckt. Schön, dass du vorbeischaust!",
      alt: "Klaree, der Ferienbegleiter, erkundet den Frühling",
    },
    holiday: {
      kicker: "Klaree zum Feiertag",
      hint: "Klarees Gruß lesen",
      message: (name) => `Heute ist ${name}. Klaree wünscht dir einen schönen Tag!`,
      alt: "Klaree grüßt zum Feiertag",
    },
    preview: "Vorschau · nicht der heutige Feiertag",
    open: "Gruß öffnen",
    close: "Gruß schließen",
  },
  en: {
    christmas: {
      title: "Merry Christmas!",
      kicker: "A Christmas greeting from Klaree",
      hint: "Read Klaree’s greeting",
      message: "Klaree wishes you a peaceful, lovely Christmas. Thanks for visiting Schulferienklar!",
      alt: "Klaree in a red winter cape beside a Christmas tree",
    },
    easter: {
      title: "A little Easter surprise",
      kicker: "An Easter greeting from Klaree",
      hint: "Read Klaree’s greeting",
      message: "Happy Easter! Klaree has hidden another treat. It's lovely to see you here!",
      alt: "Klaree, your holiday companion, exploring spring",
    },
    holiday: {
      kicker: "A holiday hello from Klaree",
      hint: "Read Klaree’s greeting",
      message: (name) => `Today is ${name}. Klaree hopes you have a lovely day!`,
      alt: "Klaree greeting you on a public holiday",
    },
    preview: "Preview · not today’s holiday",
    open: "Open greeting",
    close: "Close greeting",
  },
};

export function couldHaveKlareeHoliday(date) {
  // Avoid loading any additional state data for most months.
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return false;
  return [0, 2, 3, 4, 9, 10, 11].includes(date.getMonth());
}

function validStateHolidays(dataset, stateCode, year) {
  if (dataset?.bundeslandCode !== stateCode || dataset?.year !== year || !Array.isArray(dataset?.holidays)) return [];
  return dataset.holidays.filter((event) =>
    event.scope === "statewide" && event.includeInDefaultCalendar === true &&
    event.type === "public_holiday" && /^\d{4}-\d{2}-\d{2}$/.test(event.date));
}

export function getKlareeSeasonalMoment({
  date, stateCode, holidayDataset = null, locale = "de", preview = null,
} = {}) {
  const key = localDateKey(date);
  if (!key) return null;
  const year = date.getFullYear();
  const lang = locale === "en" ? "en" : "de";
  const copy = content[lang];
  const stateHolidays = validStateHolidays(holidayDataset, stateCode, year);

  const makeChristmas = (isPreview = false) => ({
    id: `christmas-${year}`, kind: "christmas", isPreview,
    title: copy.christmas.title, kicker: copy.christmas.kicker,
    message: copy.christmas.message, hint: copy.christmas.hint, alt: copy.christmas.alt,
    image: "/klaree-christmas-2026.webp", previewLabel: isPreview ? copy.preview : "",
    statutory: false,
  });
  const makeEaster = (isPreview = false) => ({
    id: `easter-${year}`, kind: "easter", isPreview,
    title: copy.easter.title, kicker: copy.easter.kicker,
    message: copy.easter.message, hint: copy.easter.hint, alt: copy.easter.alt,
    image: "/klaree-walk.webp", previewLabel: isPreview ? copy.preview : "",
    statutory: false,
  });

  // Unlisted visual QA links; visibly marked as previews, never described
  // as actual public holidays or used to alter the calendar.
  if (preview === "christmas") return makeChristmas(true);
  if (preview === "easter") return makeEaster(true);

  // Christmas Eve is a seasonal greeting, not a claim that 24 December
  // is a statutory public holiday.
  if (key.slice(5) >= "12-24" && key.slice(5) <= "12-26") return makeChristmas();

  // Derive actual Easter dates from this state's current-year holiday data
  // rather than hardcoding a date or using the planner's selected year.
  const goodFriday = stateHolidays.find((item) => item.id?.endsWith("-good-friday"));
  const easterMonday = stateHolidays.find((item) => item.id?.endsWith("-easter-monday"));
  if (goodFriday && easterMonday) {
    const todayOrd = ordinal(key);
    const startOrd = ordinal(goodFriday.date);
    const endOrd = ordinal(easterMonday.date);
    if (todayOrd !== null && startOrd !== null && endOrd !== null &&
        todayOrd >= startOrd - 2 && todayOrd <= endOrd) return makeEaster();
  }

  const holiday = stateHolidays.find((item) =>
    item.date === key && [...HIGHLIGHTED_IDS].some((id) => item.id?.endsWith(`-${id}`)));
  if (!holiday) return null;
  const name = holiday.name?.[lang] || holiday.name?.de;
  if (!name) return null;
  return {
    id: `holiday-${stateCode}-${holiday.date}-${holiday.id}`,
    kind: "holiday", isPreview: false, statutory: true,
    title: name,
    kicker: copy.holiday.kicker,
    message: copy.holiday.message(name),
    hint: copy.holiday.hint,
    alt: copy.holiday.alt,
    image: "/klaree-mascot.webp",
    previewLabel: "",
  };
}

export function getKlareeGreetingControls(locale) {
  const lang = locale === "en" ? "en" : "de";
  return { open: content[lang].open, close: content[lang].close };
}
