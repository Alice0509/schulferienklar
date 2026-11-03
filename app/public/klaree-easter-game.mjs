// Seasonal Klaree mini-game. Runs locally, without accounts, ads, network calls or storage.
export const SPOTS = Object.freeze([
  "flower", "hedge", "stone", "bench", "tree", "watering", "basket", "fence", "grass",
]);
export const TREAT_COUNT = 5;

export function createEasterRound(random = Math.random) {
  const shuffled = [...SPOTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const value = Number(random());
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(.999999999, value)) : 0;
    const j = Math.floor(normalized * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const hidden = new Set(shuffled.slice(0, TREAT_COUNT));
  const checked = new Set();
  let found = 0;
  return {
    check(id) {
      if (!SPOTS.includes(id) || checked.has(id) || found === TREAT_COUNT) {
        return { kind: "ignored", found, complete: found === TREAT_COUNT };
      }
      checked.add(id);
      const success = hidden.has(id);
      if (success) found++;
      return { kind: success ? "treat" : "empty", found, complete: found === TREAT_COUNT };
    },
    get found() { return found; },
  };
}

const I18N = {
  de: {
    headline: "Klarees Leckerli-Suche",
    kicker: "Kleine Geschichten mit Klaree",
    intro: "Klaree hat fünf Leckerlis im Garten versteckt. Jetzt weiß sie nicht mehr, wo. Hilfst du ihr beim Suchen?",
    instruction: "Tippe auf ein Versteck oder wähle es mit der Tastatur aus. Finde alle fünf Leckerlis.",
    none: "Hier liegt nichts. Weiter geht’s.",
    found: "Ein Leckerli gefunden!",
    complete: "Geschafft! Klaree hat alle fünf Leckerlis wiedergefunden.",
    reset: "Noch einmal suchen",
    current: (n) => `${n} von 5 Leckerlis gefunden`,
    spot: (name) => `Versteck untersuchen: ${name}`,
    foundSpot: (name) => `Leckerli bei ${name} gefunden`,
    emptySpot: (name) => `Kein Leckerli bei ${name}`,
    tileFound: "Gefunden",
    tileEmpty: "Leer",
    portraitAlt: "Klaree, der Ferienbegleiter",
    locations: {
      flower:"Blumenbeet",hedge:"Hecke",stone:"Stein",bench:"Bank",tree:"Baum",
      watering:"Gießkanne",basket:"Korb",fence:"Zaun",grass:"Wiese",
    },
  },
  en: {
    headline: "Klaree’s Treat Hunt",
    kicker: "Little stories with Klaree",
    intro: "Klaree hid five treats in the garden. Now she can’t remember where. Can you help find them?",
    instruction: "Tap a hiding place, or select it with your keyboard. Find all five treats.",
    none: "Nothing here. Keep looking.",
    found: "A treat found!",
    complete: "Found them all! Klaree has all five treats again.",
    reset: "Play again",
    current: (n) => `${n} of 5 treats found`,
    spot: (name) => `Check hiding place: ${name}`,
    foundSpot: (name) => `Treat found at ${name}`,
    emptySpot: (name) => `No treat at ${name}`,
    tileFound: "Found",
    tileEmpty: "Empty",
    portraitAlt: "Klaree, your school-holiday companion",
    locations: {
      flower:"Flower bed",hedge:"Hedge",stone:"Stone",bench:"Bench",tree:"Tree",
      watering:"Watering can",basket:"Basket",fence:"Fence",grass:"Meadow",
    },
  },
};

export function getEasterCopy(locale) { return I18N[locale === "en" ? "en" : "de"]; }

export function mountKlareeEasterGame(doc = document) {
  const locale = new URLSearchParams(doc.defaultView.location.search).get("lang") === "en" ? "en" : "de";
  const text = getEasterCopy(locale);
  doc.documentElement.lang = locale;
  doc.title = locale === "en" ? "Klaree’s Treat Hunt · Schulferienklar" : "Klarees Leckerli-Suche · Schulferienklar";
  const slots = {
    kicker: doc.getElementById("game-kicker"),
    headline: doc.getElementById("game-title"),
    intro: doc.getElementById("game-intro"),
    instruction: doc.getElementById("game-instruction"),
    status: doc.getElementById("game-status"),
    count: doc.getElementById("game-count"),
    reset: doc.getElementById("game-reset"),
    finish: doc.getElementById("game-finish"),
    portrait: doc.getElementById("game-klaree"),
    toggle: doc.getElementById("language-toggle"),
    progress: doc.getElementById("game-progress"),
  };
  for (const key of ["kicker","headline","intro","instruction"]) slots[key].textContent = text[key];
  slots.reset.textContent = text.reset;
  slots.portrait.alt = text.portraitAlt;
  slots.toggle.textContent = locale === "de" ? "English" : "Deutsch";
  slots.toggle.href = locale === "de" ? "?lang=en" : "klaree-ostern-2027.html";
  const tiles = [...doc.querySelectorAll("button[data-spot]")];
  for (const tile of tiles) {
    const name = text.locations[tile.dataset.spot];
    tile.querySelector(".spot-name").textContent = name;
  }

  let round;
  const begin = () => {
    round = createEasterRound();
    slots.portrait.src = "/klaree-walk.webp";
    slots.progress.value = 0;
    slots.count.textContent = text.current(0);
    slots.status.textContent = "";
    slots.finish.hidden = true;
    for (const tile of tiles) {
      const name = text.locations[tile.dataset.spot];
      tile.disabled = false;
      tile.removeAttribute("data-result");
      tile.setAttribute("aria-label", text.spot(name));
      tile.querySelector(".spot-result").textContent = "";
    }
  };
  for (const tile of tiles) {
    tile.addEventListener("click", () => {
      const state = round.check(tile.dataset.spot);
      if (state.kind === "ignored") return;
      const name = text.locations[tile.dataset.spot];
      tile.dataset.result = state.kind;
      tile.disabled = true;
      tile.querySelector(".spot-result").textContent = state.kind === "treat" ? text.tileFound : text.tileEmpty;
      tile.setAttribute("aria-label", state.kind === "treat" ? text.foundSpot(name) : text.emptySpot(name));
      slots.progress.value = state.found;
      slots.count.textContent = text.current(state.found);
      slots.status.textContent = state.kind === "treat" ? text.found : text.none;
      if (state.complete) {
        slots.status.textContent = text.complete;
        slots.finish.hidden = false;
        slots.finish.textContent = text.complete;
        slots.portrait.src = "/klaree-rest.webp";
        for (const remaining of tiles) remaining.disabled = true;
      }
    });
  }
  slots.reset.addEventListener("click", begin);
  begin();
}

if (typeof document !== "undefined") mountKlareeEasterGame(document);
