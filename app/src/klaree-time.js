// Klaree's pose is chosen once from the visitor's device-local arrival hour.
// No timers, geolocation, cookies or tracking; the character never changes mid-visit.
const moments = Object.freeze({
  morning: {
    image: "/klaree-walk.webp",
    de: { alt: "Klaree ist unterwegs", line: "Schon unterwegs zum nächsten freien Tag." },
    en: { alt: "Klaree is out for a walk", line: "Already looking out for the next day off." },
  },
  daytime: {
    image: "/klaree-calendar.webp",
    de: { alt: "Klaree sieht sich den Kalender an", line: "Die nächsten Ferien im Blick." },
    en: { alt: "Klaree looks at the calendar", line: "Keeping an eye on the next school break." },
  },
  evening: {
    image: "/klaree-mascot.webp",
    de: { alt: "Klaree sitzt und wartet", line: "Zeit, den nächsten freien Tag zu planen." },
    en: { alt: "Klaree sits and waits", line: "Time to think about the next day off." },
  },
  night: {
    image: "/klaree-rest.webp",
    de: { alt: "Klaree ruht sich aus", line: "Die Ferien laufen nicht weg." },
    en: { alt: "Klaree is resting", line: "The holidays aren't going anywhere." },
  },
});

export function getKlareeMoment(hour, locale = "de") {
  const h = Number.isInteger(hour) && hour >= 0 && hour < 24 ? hour : 12;
  const key = h >= 5 && h < 11
    ? "morning"
    : h >= 11 && h < 17
      ? "daytime"
      : h >= 17 && h < 22
        ? "evening"
        : "night";
  const moment = moments[key];
  return { key, image: moment.image, ...moment[locale === "en" ? "en" : "de"] };
}
