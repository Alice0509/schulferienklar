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

// Gregorian Easter Sunday (Meeus/Jones/Butcher algorithm). Easter is a
// movable date, so never hard-code a specific year into an editorial event.
// Use UTC calendar arithmetic to avoid DST shifts in March/April. This is
// strictly for seasonal artwork/game timing, not statutory holiday claims.
export function getKlareeEasterWindow(year) {
  if (!Number.isInteger(year) || year < 1583 || year > 4099) return null;
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k + 7) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  const easterTime = Date.UTC(year, month - 1, day);
  const isoDay = (offset) => new Date(easterTime + offset * 86400000).toISOString().slice(0, 10);
  return Object.freeze({
    year,
    sunday: isoDay(0),
    start: isoDay(-14),
    end: isoDay(7),
  });
}

export function isKlareeEasterEventDate(date) {
  const key = localDateKey(date);
  if (!key) return false;
  const window = getKlareeEasterWindow(date.getFullYear());
  return Boolean(window && key >= window.start && key <= window.end);
}

const content = {
  de: {
    christmas: {
      title: "Frohe Weihnachten!",
      teaser: "Ein kleiner Gruß zur Weihnachtszeit.",
      kicker: "Klarees Weihnachtsgruß",
      hint: "Klarees Gruß lesen",
      message: "Klaree wünscht dir eine schöne, ruhige Weihnachtszeit. Danke, dass du Schulferienklar besuchst!",
      alt: "Klaree mit rotem Winterumhang neben einem Weihnachtsbaum",
    },
    easter: {
      title: "Eine kleine Osterüberraschung",
      teaser: "Eine kleine Osterüberraschung von Klaree.",
      kicker: "Klarees Ostergruß",
      hint: "Klarees Gruß lesen",
      message: "Frohe Ostern! Klaree wünscht dir schöne Feiertage. Vielleicht wartet ja noch eine kleine Überraschung auf dich.",
      alt: "Klaree, der Ferienbegleiter, erkundet den Frühling",
    },
    summer: {
      title: "Ein Sommergruß von Klaree",
      teaser: "Ein kleiner Sommermoment zum Durchatmen.",
      kicker: "Klarees Sommerzeit",
      hint: "Klarees Gruß lesen",
      message: "Klaree wünscht dir einen schönen Sommer – mit Zeit für kleine Entdeckungen und entspannte Pausen. Viel Freude bei deinen Ferienplänen!",
      alt: "Klaree erkundet einen sonnigen Sommergarten",
    },
    autumn: {
      title: "Ein bunter Herbstgruß",
      teaser: "Klaree begrüßt den Herbst mit dir.",
      kicker: "Klarees Herbstzeit",
      hint: "Klarees Gruß lesen",
      message: "Bunte Blätter, klare Luft und kleine Pausen: Klaree wünscht dir einen schönen, gemütlichen Herbst. Nimm dir Zeit für das, was dir guttut!",
      alt: "Klaree ruht sich zwischen herbstlichen Blättern aus",
    },
    holiday: {
      kicker: "Klaree zum Feiertag",
      teaser: "Ein kleiner Feiertagsgruß für dich.",
      hint: "Klarees Gruß lesen",
      message: (name) => `Heute ist ${name}. Klaree wünscht dir einen schönen Tag!`,
      alt: "Klaree grüßt zum Feiertag",
    },
    preview: "Vorschau · derzeit nicht die Saison",
    open: "Gruß ansehen",
    close: "Gruß schließen",
    later: "Danke, Klaree!",
    dismiss: "Saisonale Klaree-Karte ausblenden",
  },
  en: {
    christmas: {
      title: "Merry Christmas!",
      teaser: "A little Christmas-season greeting for you.",
      kicker: "A Christmas greeting from Klaree",
      hint: "Read Klaree’s greeting",
      message: "Klaree wishes you a peaceful, lovely Christmas. Thanks for visiting Schulferienklar!",
      alt: "Klaree in a red winter cape beside a Christmas tree",
    },
    easter: {
      title: "A little Easter surprise",
      teaser: "A little seasonal surprise from Klaree.",
      kicker: "An Easter greeting from Klaree",
      hint: "Read Klaree’s greeting",
      message: "Happy Easter! Klaree wishes you a lovely holiday. Perhaps there is still a little surprise to discover.",
      alt: "Klaree, your holiday companion, exploring spring",
    },
    summer: {
      title: "A summer hello from Klaree",
      teaser: "A little summer moment to slow down.",
      kicker: "Summer with Klaree",
      hint: "Read Klaree’s greeting",
      message: "Klaree wishes you a lovely summer, full of little discoveries and relaxing moments. Enjoy making your holiday plans!",
      alt: "Klaree exploring a sunny summer garden",
    },
    autumn: {
      title: "A colorful autumn hello",
      teaser: "Klaree welcomes autumn with you.",
      kicker: "Autumn with Klaree",
      hint: "Read Klaree’s greeting",
      message: "Colorful leaves, crisp air and quiet moments: Klaree wishes you a cozy, lovely autumn. Make room for the things you enjoy!",
      alt: "Klaree resting among autumn leaves",
    },
    holiday: {
      kicker: "A holiday hello from Klaree",
      teaser: "A little holiday greeting for you.",
      hint: "Read Klaree’s greeting",
      message: (name) => `Today is ${name}. Klaree hopes you have a lovely day!`,
      alt: "Klaree greeting you on a public holiday",
    },
    preview: "Preview · not currently in season",
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

  // Keep the approved Klaree poses; each season gets its own landscape scene.
  // Seasonal greetings are editorial artwork, not statutory holiday claims.
  const seasonalArt = {
    christmas: "/klaree-christmas-2026.webp",
    easter: "/klaree-walk.webp",
    summer: "/klaree-walk.webp",
    autumn: "/klaree-rest.webp",
  };
  const makeSeason = (kind, isPreview = false) => ({
    id: `${kind}-${kind === "christmas" && date.getMonth() === 0 ? year - 1 : year}`,
    kind, isPreview,
    title: copy[kind].title, kicker: copy[kind].kicker,
    teaser: copy[kind].teaser,
    message: copy[kind].message, hint: copy[kind].hint, alt: copy[kind].alt,
    image: seasonalArt[kind], previewLabel: isPreview ? copy.preview : "",
    statutory: false,
  });

  // Unlisted visual QA links; visibly marked as previews and not
  // used to alter any holiday or school-calendar data.
  if (Object.hasOwn(seasonalArt, preview)) return makeSeason(preview, true);

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
        teaser: copy.holiday.teaser,
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
  if (monthDay >= "12-01" || monthDay <= "01-06") return makeSeason("christmas");

  // Editorial Easter greeting: 14 days before Easter Sunday through
  // 7 days after, every year. Unlike official state holiday claims above,
  // an illustrated seasonal greeting can use the Gregorian calendar
  // calculation even before the next year's holiday dataset is published.
  if (isKlareeEasterEventDate(date)) return makeSeason("easter");

  // These are *seasonal* greetings rather than announcements of a
  // state's summer holidays. Those dates differ across German states.
  // Leave a quiet gap after each season for Klaree's time-of-day cameo.
  if (monthDay >= "06-21" && monthDay <= "08-31") return makeSeason("summer");
  if (monthDay >= "09-22" && monthDay <= "11-15") return makeSeason("autumn");

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
