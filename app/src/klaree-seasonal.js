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
      message: "Frohe Ostern! Klaree wünscht dir schöne Feiertage. Vielleicht wartet ja noch eine kleine Überraschung auf dich.",
      alt: "Klaree, der Ferienbegleiter, erkundet den Frühling",
    },
    holiday: {
      kicker: "Klaree zum Feiertag",
      hint: "Klarees Gruß lesen",
      message: (name) => `Heute ist ${name}. Klaree wünscht dir einen schönen Tag!`,
      alt: "Klaree grüßt zum Feiertag",
    },
    preview: "Vorschau · nicht der heutige Feiertag",
    open: "Gruß ansehen",
    close: "Gruß schließen",
    later: "Danke, Klaree!",
    dismiss: "Saisonale Klaree-Karte ausblenden",
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
      message: "Happy Easter! Klaree wishes you a lovely holiday. Perhaps there is still a little surprise to discover.",
      alt: "Klaree, your holiday companion, exploring spring",
    },
    holiday: {
      kicker: "A holiday hello from Klaree",
      hint: "Read Klaree’s greeting",
      message: (name) => `Today is ${name}. Klaree hopes you have a lovely day!`,
      alt: "Klaree greeting you on a public holiday",
    },
    preview: "Preview · not today’s holiday",
    open: "View greeting",
    close: "Close greeting",
    later: "Thanks, Klaree!",
    dismiss: "Dismiss Klaree’s seasonal card",
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
    id: `christmas-${date.getMonth() === 0 ? year - 1 : year}`, kind: "christmas", isPreview,
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

  // Official, verified statewide holidays take priority over the broad
  // seasonal artwork. These one-day greetings are not presented as seasons.
  const holiday = stateHolidays.find((item) =>
    item.date === key && [...HIGHLIGHTED_IDS].some((id) => item.id?.endsWith(`-${id}`)));
  if (holiday) {
    const name = holiday.name?.[lang] || holiday.name?.de;
    if (name) {
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
  }

  // Advent through Epiphany is a season, not just December 24–26.
  // This is a friendly Christmas-season greeting, never a statutory
  // holiday claim (especially on December 24).
  const monthDay = key.slice(5);
  if (monthDay >= "12-01" || monthDay <= "01-06") return makeChristmas();

  // Easter season: 14 days before Easter Sunday through 7 days after.
  // Derive Easter Sunday from the verified current-year Good Friday and
  // Easter Monday records of the selected state, not the planner's year.
  const goodFriday = stateHolidays.find((item) => item.id?.endsWith("-good-friday"));
  const easterMonday = stateHolidays.find((item) => item.id?.endsWith("-easter-monday"));
  if (goodFriday && easterMonday) {
    const todayOrd = ordinal(key);
    const fridayOrd = ordinal(goodFriday.date);
    const mondayOrd = ordinal(easterMonday.date);
    const sundayOrd = mondayOrd === null ? null : mondayOrd - 1;
    if (todayOrd !== null && fridayOrd !== null && sundayOrd !== null &&
        fridayOrd === sundayOrd - 2 &&
        todayOrd >= sundayOrd - 14 && todayOrd <= sundayOrd + 7) {
      return makeEaster();
    }
  }

  return null;
}

export function getKlareeGreetingControls(locale) {
  const lang = locale === "en" ? "en" : "de";
  return {
    open: content[lang].open,
    close: content[lang].close,
    later: content[lang].later,
    dismiss: content[lang].dismiss,
  };
}
