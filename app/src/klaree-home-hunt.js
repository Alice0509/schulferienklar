// A small, opt-out-friendly Easter encounter on the homepage, separate from
// the unlisted garden preview. No state storage, ads, user tracking or modal.
export const HUNT_GOAL = 5;
export const PEEK_VISIBLE_MS = 25000;
export const FIRST_PEEK_MS = 15000;
export const PEEK_INTERVAL_MIN_MS = 15000;
export const PEEK_INTERVAL_MAX_MS = 30000;

export function boundedRandom(random = Math.random) {
  const value = Number(random());
  return Number.isFinite(value) ? Math.max(0, Math.min(.999999999, value)) : 0;
}

export function nextPeekInterval(random = Math.random) {
  return PEEK_INTERVAL_MIN_MS
    + Math.floor(boundedRandom(random) * (PEEK_INTERVAL_MAX_MS - PEEK_INTERVAL_MIN_MS + 1));
}

const SLOTS = Object.freeze([
  { id: "upper-left", side: "left", at: .23 },
  { id: "middle-right", side: "right", at: .43 },
  { id: "lower-left", side: "left", at: .66 },
  { id: "upper-right", side: "right", at: .23 },
  { id: "middle-left", side: "left", at: .43 },
  { id: "lower-right", side: "right", at: .66 },
]);

export function intersectsBox(a, b, padding = 0) {
  return a.left < b.right + padding && a.right > b.left - padding
    && a.top < b.bottom + padding && a.bottom > b.top - padding;
}

// Explore the visible viewport, without a layout shift. Interactive form
// controls and all ad rectangles are treated as obstacles.
export function findSafePeek({ width, height, obstacles = [], previousId = null, random = Math.random }) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 300 || height < 360) return null;
  const small = width < 600;
  const size = small ? 88 : 108;
  const outer = small ? 12 : 26;
  const boxHeight = small ? 108 : 128;
  const availableHeight = height - boxHeight;
  const candidates = SLOTS.map((slot) => {
    const left = slot.side === "left" ? outer : width - outer - size;
    const top = Math.max(66, Math.min(height - boxHeight - 90, Math.round(availableHeight * slot.at)));
    return {
      id: slot.id, left, top, right: left + size, bottom: top + boxHeight,
    };
  });
  const valid = candidates.filter((box) => box.id !== previousId &&
    !obstacles.some((obstacle) => intersectsBox(box, obstacle, 9)));
  // If there is no collision-free position, silently skip this visit.
  if (valid.length === 0) return null;
  return valid[Math.floor(boundedRandom(random) * valid.length)];
}

const I18N = {
  de: {
    title: "Klaree ist auf Ostertour",
    intro: "Psst … Klaree schaut ab und zu auf der Seite vorbei. Entdeckst du sie?",
    preview: "Vorschau · noch kein Oster-Event",
    progress: (count) => `${count} von 5 Begegnungen`,
    summon: "Klaree entdecken",
    hide: "Klarees Osterbesuche ausblenden",
    resume: "Klaree wieder einladen",
    peek: "Da ist Klaree! Antippen und entdecken.",
    found: (count) => {
      const greeting = count === HUNT_GOAL
        ? "Alle fünf Begegnungen entdeckt! Klaree schickt dir einen Frühlingsgruß."
        : count === 1
          ? "Da ist sie! Klaree freut sich, dass du sie gefunden hast."
          : count === 3
            ? "Schon drei Begegnungen! Klaree erkundet die Seite weiter."
            : "Klaree entdeckt! Mal sehen, wo sie als Nächstes auftaucht.";
      return `${greeting} ${count === HUNT_GOAL ? "Fünf bunte Ostereier warten auf dich!" : "Ein buntes Osterei bleibt als Gruß zurück."}`;
    },
    completed: "Geschafft! Du hast Klaree fünfmal entdeckt. Frohe Osterzeit!",
    finalKicker: "Klarees Osterüberraschung · 5 von 5",
    finalTitle: "Hurra, du hast alle fünf gefunden!",
    finalMessage: "Klaree freut sich riesig! Sie hat dir fünf bunte Ostereier und einen kleinen Ostergruß dagelassen. Danke fürs Mitspielen!",
    again: "Noch einmal entdecken",
    waiting: "Klaree versteckt sich gerade. Du kannst sie auch rufen.",
  },
  en: {
    title: "Klaree is out exploring",
    intro: "Psst … Klaree sometimes peeks out around this page. Can you spot her?",
    preview: "Preview · not yet the Easter event",
    progress: (count) => `${count} of 5 encounters`,
    summon: "Find Klaree",
    hide: "Hide Klaree’s Easter visits",
    resume: "Invite Klaree back",
    peek: "There’s Klaree! Tap to find her.",
    found: (count) => {
      const greeting = count === HUNT_GOAL
        ? "You spotted all five visits! Klaree sends you a springtime hello."
        : count === 1
          ? "There she is! Klaree is so happy you found her."
          : count === 3
            ? "Three encounters already! Klaree keeps exploring."
            : "Klaree spotted! Where will she pop up next?";
      return `${greeting} ${count === HUNT_GOAL ? "Five colorful Easter eggs are waiting for you!" : "A little Easter egg is left behind for you."}`;
    },
    completed: "You did it! You spotted Klaree five times. Happy Easter season!",
    finalKicker: "Klaree’s Easter surprise · 5 of 5",
    finalTitle: "Hooray! You found all five!",
    finalMessage: "Klaree is delighted! She left you five colorful Easter eggs and a little springtime hello. Thanks for playing!",
    again: "Play again",
    waiting: "Klaree is hiding for now. You can call her over.",
  },
};

export function getHomeHuntCopy(locale = "de") {
  return I18N[locale === "en" ? "en" : "de"];
}
