import {
  calculateEffectivePeriod,
  formatDateRange,
  getCountdownLabel,
  getLocalDateKey,
  parseWidgetOptions,
  selectUpcomingSchoolEvents,
} from "./next-school-holidays-core.js";

async function fetchJson(url) {
  const response = await fetch(url, {
    credentials: "omit",
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error(
      `Daten konnten nicht geladen werden: ${response.status}`,
    );
  }

  return response.json();
}

async function loadCalendarDocuments(
  state,
  todayDate,
) {
  const currentYear = Number(
    todayDate.slice(0, 4),
  );

  const years = (state.years || [])
    .map(Number)
    .filter((year) => {
      return year >= currentYear - 1;
    });

  const results = await Promise.allSettled(
    years.map((year) => {
      return fetchJson(
        `/api/v1/calendar/${state.code}/${year}.json`,
      );
    }),
  );

  const documents = results
    .filter((result) => {
      return result.status === "fulfilled";
    })
    .map((result) => result.value);

  if (documents.length === 0) {
    throw new Error(
      "Keine Kalenderdaten verfügbar.",
    );
  }

  return documents;
}

async function loadWidgetData(
  options,
  todayDate,
) {
  const statesDocument = await fetchJson(
    "/api/v1/states.json",
  );

  const state = (
    statesDocument.states || []
  ).find((item) => {
    return item.code === options.state;
  });

  if (!state) {
    throw new Error(
      "Dieses Bundesland wird nicht unterstützt.",
    );
  }

  const calendarDocuments =
    await loadCalendarDocuments(
      state,
      todayDate,
    );

  return {
    state,
    calendarDocuments,
  };
}

function formatCheckedDate(dateValue) {
  if (!dateValue) {
    return "Prüfdatum nicht angegeben";
  }

  const dateKey = String(dateValue).slice(
    0,
    10,
  );

  const [year, month, day] =
    dateKey.split("-");

  if (!year || !month || !day) {
    return "Prüfdatum nicht angegeben";
  }

  return `Geprüft am ${day}.${month}.${year}`;
}

function createHolidayItem(
  event,
  publicHolidayEvents,
  todayDate,
) {
  const article =
    document.createElement("article");

  article.className = "holiday-item";

  const heading =
    document.createElement("div");

  heading.className = "holiday-heading";

  const name =
    document.createElement("h2");

  name.className = "holiday-name";
  name.textContent =
    event.name?.de ||
    "Schulferien";

  const badge =
    document.createElement("span");

  badge.className = "countdown-badge";
  badge.textContent = getCountdownLabel(
    event,
    todayDate,
  );

  heading.append(name, badge);

  const officialPeriod =
    document.createElement("p");

  officialPeriod.className =
    "holiday-period";

  officialPeriod.textContent =
    formatDateRange(
      event.startDate,
      event.endDate,
    );

  article.append(
    heading,
    officialPeriod,
  );

  const effectivePeriod =
    calculateEffectivePeriod(
      event,
      publicHolidayEvents,
    );

  if (
    effectivePeriod.differsFromOfficial
  ) {
    const effectiveText =
      document.createElement("p");

    effectiveText.className =
      "effective-period";

    const label =
      document.createElement("strong");

    label.textContent =
      "Zusammenhängend frei: ";

    effectiveText.append(
      label,
      formatDateRange(
        effectivePeriod.startDate,
        effectivePeriod.endDate,
      ),
    );

    article.append(effectiveText);
  }

  return article;
}

function buildAttributionUrl(
  state,
  nextEvent,
) {
  const url = new URL(
    "https://www.schulferienklar.de/",
  );

  url.searchParams.set(
    "state",
    state.code,
  );

  url.searchParams.set(
    "year",
    nextEvent.startDate.slice(0, 4),
  );

  url.searchParams.set(
    "utm_source",
    "widget",
  );

  url.searchParams.set(
    "utm_medium",
    "embed",
  );

  url.searchParams.set(
    "utm_campaign",
    `next-school-holidays-${state.code.toLowerCase()}`,
  );

  return url.toString();
}

function showError(message) {
  const loading =
    document.querySelector(
      "#widget-loading",
    );

  const content =
    document.querySelector(
      "#widget-content",
    );

  const error =
    document.querySelector(
      "#widget-error",
    );

  const errorMessage =
    document.querySelector(
      "#widget-error-message",
    );

  const card =
    document.querySelector(
      ".widget-card",
    );

  loading.hidden = true;
  content.hidden = true;
  error.hidden = false;
  errorMessage.textContent = message;

  card.setAttribute(
    "aria-busy",
    "false",
  );
}

async function renderWidget() {
  const options = parseWidgetOptions(
    window.location.search,
  );

  const todayDate =
    getLocalDateKey();

  document.body.dataset.theme =
    options.theme;

  document.documentElement.style
    .colorScheme = options.theme;

  try {
    const {
      state,
      calendarDocuments,
    } = await loadWidgetData(
      options,
      todayDate,
    );

    const upcomingEvents =
      selectUpcomingSchoolEvents(
        calendarDocuments,
        todayDate,
        options.count,
      );

    if (upcomingEvents.length === 0) {
      showError(
        "Für dieses Bundesland liegen keine weiteren Termine vor.",
      );

      return;
    }

    const publicHolidayEvents =
      calendarDocuments.flatMap(
        (calendarDocument) => {
          return (
            calendarDocument.events || []
          ).filter((event) => {
            return (
              event.kind ===
              "public_holiday"
            );
          });
        },
      );

    const nextEvent =
      upcomingEvents[0];

    const title =
      document.querySelector(
        "#widget-title",
      );

    const list =
      document.querySelector(
        "#widget-holiday-list",
      );

    const checked =
      document.querySelector(
        "#widget-checked",
      );

    const source =
      document.querySelector(
        "#widget-source",
      );

    const attribution =
      document.querySelector(
        "#widget-attribution",
      );

    const loading =
      document.querySelector(
        "#widget-loading",
      );

    const content =
      document.querySelector(
        "#widget-content",
      );

    const card =
      document.querySelector(
        ".widget-card",
      );

    title.textContent =
      `Nächste Schulferien in ${state.name}`;

    list.replaceChildren(
      ...upcomingEvents.map((event) => {
        return createHolidayItem(
          event,
          publicHolidayEvents,
          todayDate,
        );
      }),
    );

    checked.textContent =
      formatCheckedDate(
        nextEvent.source?.lastCheckedAt,
      );

    if (nextEvent.source?.url) {
      source.href =
        nextEvent.source.url;

      source.textContent =
        "Offizielle Quelle";

      if (nextEvent.source.name) {
        source.title =
          nextEvent.source.name;

        source.setAttribute(
          "aria-label",
          `Offizielle Quelle: ${nextEvent.source.name}`,
        );
      }

      source.hidden = false;
    } else {
      source.hidden = true;
    }

    attribution.href =
      buildAttributionUrl(
        state,
        nextEvent,
      );

    loading.hidden = true;
    content.hidden = false;

    card.setAttribute(
      "aria-busy",
      "false",
    );
  } catch (error) {
    console.error(error);

    showError(
      "Bitte öffne Schulferienklar direkt und versuche es später erneut.",
    );
  }
}

renderWidget();
