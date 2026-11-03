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
    foundAt: (name) => `Ein Leckerli entdeckt! Klaree hat es bei ${name} gefunden.`,
    emptyAt: (name) => `Bei ${name} ist nichts. Klaree sucht weiter.`,
    ready: "Klaree schaut sich im Garten um …",
    gardenLabel: "EIN GARTEN. NEUN VERSTECKE.",
    complete: "Geschafft! Klaree hat alle fünf Leckerlis wiedergefunden.",
    reset: "Noch einmal suchen",
    current: (n) => `${n} von 5 Leckerlis gefunden`,
    spot: (name) => `Versteck untersuchen: ${name}`,
    foundSpot: (name) => `Leckerli bei ${name} gefunden`,
    emptySpot: (name) => `Kein Leckerli bei ${name}`,
    tileFound: "Gefunden",
    tileEmpty: "Leer",
    calendar: "Kalender öffnen",
    brandLabel: "Schulferienklar Startseite",
    navigationLabel: "Seiten-Navigation",
    legalLabel: "Rechtliches",
    garden: "Garten mit neun Verstecken",
    sidebar: "Spielfortschritt",
    progressLabel: "Gefundene Leckerlis",
    privacy: "Ohne Anmeldung. Ohne Werbung. Ohne Speicherung deiner Spielzüge.",
    preview: "Vorschau für das Oster-Event 2027 · Diese Seite ist noch nicht auf der Startseite verlinkt.",
    privacyLink: "Datenschutz",
    imprintLink: "Impressum",
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
    foundAt: (name) => `A treat! Klaree found one at ${name}.`,
    emptyAt: (name) => `Nothing at ${name}. Klaree keeps looking.`,
    ready: "Klaree is exploring the garden …",
    gardenLabel: "ONE GARDEN. NINE HIDING PLACES.",
    complete: "Found them all! Klaree has all five treats again.",
    reset: "Play again",
    current: (n) => `${n} of 5 treats found`,
    spot: (name) => `Check hiding place: ${name}`,
    foundSpot: (name) => `Treat found at ${name}`,
    emptySpot: (name) => `No treat at ${name}`,
    tileFound: "Found",
    tileEmpty: "Empty",
    calendar: "Open calendar",
    brandLabel: "Schulferienklar homepage",
    navigationLabel: "Page navigation",
    legalLabel: "Legal information",
    garden: "Garden with nine hiding places",
    sidebar: "Game progress",
    progressLabel: "Treats found",
    privacy: "No sign-up. No ads. No saving your game actions.",
    preview: "Preview for Easter 2027 · This page is not yet linked from the homepage.",
    privacyLink: "Privacy",
    imprintLink: "Legal notice",
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
    progressSuffix: doc.getElementById("game-progress-suffix"),
    tokens: [...doc.querySelectorAll(".treat-token")],
    gardenLabel: doc.getElementById("game-garden-label"),
    character: doc.getElementById("garden-character"),
    calendar: doc.getElementById("game-calendar-link"),
    privacy: doc.getElementById("game-privacy"),
    preview: doc.getElementById("game-preview"),
    garden: doc.getElementById("game-garden"),
    sidebar: doc.getElementById("game-sidebar"),
    privacyLink: doc.getElementById("game-privacy-link"),
    imprintLink: doc.getElementById("game-imprint-link"),
    brand: doc.getElementById("game-brand"),
    navigation: doc.getElementById("game-navigation"),
    legal: doc.getElementById("game-legal"),
  };
  for (const key of ["kicker","headline","intro","instruction"]) slots[key].textContent = text[key];
  for (const key of ["calendar","privacy","preview","privacyLink","imprintLink"]) slots[key].textContent = text[key];
  slots.brand.setAttribute("aria-label", text.brandLabel);
  slots.navigation.setAttribute("aria-label", text.navigationLabel);
  slots.legal.setAttribute("aria-label", text.legalLabel);
  slots.garden.setAttribute("aria-label", text.garden);
  slots.sidebar.setAttribute("aria-label", text.sidebar);
  slots.progress.setAttribute("aria-label", text.progressLabel);
  slots.gardenLabel.textContent = text.gardenLabel;
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
    slots.character.removeAttribute("data-reaction");
    slots.progress.value = 0;
    slots.progressSuffix.textContent = "0 / 5";
    slots.count.textContent = text.current(0);
    slots.status.textContent = text.ready;
    slots.reset.hidden = true;
    slots.tokens.forEach((token) => token.classList.remove("is-collected"));
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
      slots.progressSuffix.textContent = `${state.found} / 5`;
      slots.count.textContent = text.current(state.found);
      slots.tokens.forEach((token, index) => token.classList.toggle("is-collected", index < state.found));
      slots.reset.hidden = false;
      slots.status.textContent = state.kind === "treat" ? text.foundAt(name) : text.emptyAt(name);
      slots.character.dataset.reaction = state.kind;
      slots.portrait.src = state.kind === "treat" ? "/klaree-mascot.webp" : "/klaree-walk.webp";
      // Only a brief, user-triggered acknowledgement; no idle or looping animation.
      const motionDisabled = doc.defaultView.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!motionDisabled && state.kind === "treat") {
        slots.portrait.animate?.(
          [{ transform: "translateY(3px) rotate(-3deg)" }, { transform: "translateY(0) rotate(0)" }],
          { duration: 340, easing: "ease-out", iterations: 1 },
        );
      }
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
