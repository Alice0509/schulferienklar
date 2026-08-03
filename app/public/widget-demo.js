const PRODUCTION_WIDGET_URL =
  "https://www.schulferienklar.de/widgets/naechste-schulferien.html";

const stateSelect = document.querySelector(
  "#widget-state",
);

const themeSelect = document.querySelector(
  "#widget-theme",
);

const countSelect = document.querySelector(
  "#widget-count",
);

const preview = document.querySelector(
  "#widget-preview",
);

const codeOutput = document.querySelector(
  "#widget-code",
);

const copyButton = document.querySelector(
  "#copy-widget-code",
);

const copyStatus = document.querySelector(
  "#copy-status",
);

const websiteRegistrationLink =
  document.querySelector(
    "#register-widget-website",
  );

let states = [];

function getInitialOptions() {
  const params = new URLSearchParams(
    window.location.search,
  );

  const state = (
    params.get("state") || "BY"
  ).toUpperCase();

  const theme =
    params.get("theme") === "dark"
      ? "dark"
      : "light";

  const requestedCount =
    params.get("count");

  const count = [
    "1",
    "2",
    "3",
  ].includes(requestedCount)
    ? requestedCount
    : "3";

  return {
    state,
    theme,
    count,
  };
}

function escapeHtmlAttributeUrl(url) {
  return url.replaceAll(
    "&",
    "&amp;",
  );
}

function buildWidgetUrl(
  baseUrl,
  options,
) {
  const url = new URL(baseUrl);

  url.searchParams.set(
    "state",
    options.state,
  );

  url.searchParams.set(
    "theme",
    options.theme,
  );

  url.searchParams.set(
    "count",
    options.count,
  );

  return url;
}

function getSelectedState() {
  return (
    states.find((state) => {
      return (
        state.code ===
        stateSelect.value
      );
    }) || {
      code: stateSelect.value,
      name: stateSelect.value,
    }
  );
}

function buildMailtoUrl(
  subject,
  body,
) {
  return (
    "mailto:joan.app.dd@gmail.com" +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}

function updateWebsiteRegistrationLink(
  state,
  options,
) {
  const themeLabel =
    options.theme === "dark"
      ? "Dunkel"
      : "Hell";

  const configurationUrl =
    window.location.href;

  websiteRegistrationLink.href =
    buildMailtoUrl(
      `Website für Schulferien-Widget einreichen: ${state.name}`,
      [
        "Hallo Schulferienklar,",
        "",
        "ich habe das kostenlose Schulferien-Widget eingebaut",
        "und möchte meine Website zur Prüfung einreichen.",
        "",
        "Name der Website / Organisation:",
        "",
        "Website-Adresse:",
        "",
        "Seite mit eingebautem Widget:",
        "",
        "Kategorie, z. B. Verein, Schule, Feriencamp oder Familienportal:",
        "",
        `Bundesland: ${state.name} (${state.code})`,
        `Darstellung: ${themeLabel}`,
        `Anzahl Termine: ${options.count}`,
        `Konfiguration: ${configurationUrl}`,
        "",
        "Freigabe zur Veröffentlichung:",
        "[ ] Ich bin damit einverstanden, dass der Name",
        "und der Link meiner Website nach Prüfung auf",
        "Schulferienklar veröffentlicht werden.",
        "",
        "Optionaler Hinweis:",
        "",
      ].join("\n"),
    );

}

function createEmbedCode(
  widgetUrl,
  stateName,
) {
  const escapedUrl =
    escapeHtmlAttributeUrl(
      widgetUrl.toString(),
    );

  return `<iframe
  src="${escapedUrl}"
  title="Nächste Schulferien in ${stateName}"
  loading="lazy"
  referrerpolicy="strict-origin"
  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  style="width: 100%; max-width: 480px; height: 520px; border: 0"
></iframe>`;
}

function updatePageUrl(options) {
  const pageUrl = new URL(
    window.location.href,
  );

  pageUrl.searchParams.set(
    "state",
    options.state,
  );

  pageUrl.searchParams.set(
    "theme",
    options.theme,
  );

  pageUrl.searchParams.set(
    "count",
    options.count,
  );

  window.history.replaceState(
    null,
    "",
    pageUrl,
  );
}

function updateWidget() {
  const state =
    getSelectedState();

  const options = {
    state: state.code,
    theme: themeSelect.value,
    count: countSelect.value,
  };

  const previewUrl = buildWidgetUrl(
    new URL(
      "/widgets/naechste-schulferien.html",
      window.location.origin,
    ),
    options,
  );

  const productionUrl = buildWidgetUrl(
    PRODUCTION_WIDGET_URL,
    options,
  );

  preview.src =
    previewUrl.toString();

  preview.title =
    `Nächste Schulferien in ${state.name}`;

  codeOutput.value =
    createEmbedCode(
      productionUrl,
      state.name,
    );

  updatePageUrl(options);
  updateWebsiteRegistrationLink(
    state,
    options,
  );

  copyStatus.textContent = "";
}

async function loadStates() {
  const response = await fetch(
    "/api/v1/states.json",
    {
      credentials: "omit",
      cache: "no-cache",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Bundesländer konnten nicht geladen werden.",
    );
  }

  const statesDocument =
    await response.json();

  states =
    statesDocument.states || [];

  const options = states.map(
    (state) => {
      const option =
        document.createElement(
          "option",
        );

      option.value = state.code;
      option.textContent = state.name;

      return option;
    },
  );

  stateSelect.replaceChildren(
    ...options,
  );
}

async function copyCode() {
  const code =
    codeOutput.value;

  try {
    if (!navigator.clipboard) {
      throw new Error(
        "Clipboard API unavailable",
      );
    }

    await navigator.clipboard.writeText(
      code,
    );
  } catch {
    codeOutput.focus();
    codeOutput.select();

    document.execCommand("copy");
  }

  copyStatus.textContent =
    "Der Widget-Code wurde kopiert. Nach dem Einbau kannst du deine Website unten kostenlos zur Vorstellung einreichen.";
}

async function initialize() {
  const initialOptions =
    getInitialOptions();

  try {
    await loadStates();
  } catch (error) {
    console.error(error);

    states = [
      {
        code: "BY",
        name: "Bayern",
      },
    ];
  }

  const requestedStateExists =
    states.some((state) => {
      return (
        state.code ===
        initialOptions.state
      );
    });

  stateSelect.value =
    requestedStateExists
      ? initialOptions.state
      : "BY";

  themeSelect.value =
    initialOptions.theme;

  countSelect.value =
    initialOptions.count;

  updateWidget();
}

stateSelect.addEventListener(
  "change",
  updateWidget,
);

themeSelect.addEventListener(
  "change",
  updateWidget,
);

countSelect.addEventListener(
  "change",
  updateWidget,
);

copyButton.addEventListener(
  "click",
  copyCode,
);

initialize();
