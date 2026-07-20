(() => {
  "use strict";

  const CLARITY_PROJECT_ID = "x2yelo2qbm";
  const STORAGE_KEY = "schulferienklar.analyticsConsent";
  const ACCEPTED = "granted";
  const REJECTED = "denied";

  let clarityLoading = false;

  function getConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // The banner still works for the current page when storage is blocked.
    }
  }

  function queueClarity() {
    window.clarity =
      window.clarity ||
      function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
  }

  function sendConsent(value) {
    queueClarity();

    window.clarity("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: value,
    });
  }

  function loadClarity() {
    if (
      clarityLoading ||
      document.querySelector('script[data-schulferienklar-clarity="true"]')
    ) {
      sendConsent("granted");
      return;
    }

    clarityLoading = true;
    queueClarity();

    const script = document.createElement("script");
    script.async = true;
    script.dataset.schulferienklarClarity = "true";
    script.src =
      `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_PROJECT_ID)}`;

    script.addEventListener("load", () => {
      clarityLoading = false;
      sendConsent("granted");
    });

    script.addEventListener("error", () => {
      clarityLoading = false;
      console.warn("Clarity konnte nicht geladen werden.");
    });

    document.head.appendChild(script);
  }

  function removeClarityCookies() {
    const cookieNames = ["_clck", "_clsk"];

    for (const name of cookieNames) {
      document.cookie =
        `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie =
        `${name}=; Max-Age=0; path=/; domain=.schulferienklar.de; SameSite=Lax`;
    }
  }

  function setConsent(value) {
    saveConsent(value);

    if (value === ACCEPTED) {
      loadClarity();
    } else {
      if (typeof window.clarity === "function") {
        sendConsent("denied");
      }
      removeClarityCookies();
    }

    closeBanner();
  }

  function bannerMarkup() {
    return `
      <div class="sf-consent-backdrop" data-consent-close></div>
      <section
        class="sf-consent-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sf-consent-title"
      >
        <p class="sf-consent-eyebrow">Datenschutz-Einstellungen</p>
        <h2 id="sf-consent-title">Optionale Nutzungsanalyse</h2>
        <p>
          Schulferienklar möchte mit Microsoft Clarity verstehen, welche
          Kalender- und Downloadfunktionen hilfreich sind. Clarity wird erst
          nach deiner Zustimmung geladen. Notwendige Funktionen bleiben auch
          ohne Zustimmung verfügbar.
        </p>
        <p class="sf-consent-more">
          Mehr dazu in der
          <a href="/datenschutz.html">Datenschutzerklärung</a>.
        </p>
        <div class="sf-consent-actions">
          <button type="button" data-consent-reject>
            Nur notwendige Funktionen
          </button>
          <button type="button" class="primary" data-consent-accept>
            Analyse erlauben
          </button>
        </div>
      </section>
    `;
  }

  function injectStyles() {
    if (document.getElementById("sf-consent-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "sf-consent-styles";
    style.textContent = `
      .sf-consent-layer {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        align-items: end;
        padding: 18px;
      }

      .sf-consent-backdrop {
        position: absolute;
        inset: 0;
        background: rgb(16 29 41 / 45%);
      }

      .sf-consent-panel {
        position: relative;
        width: min(680px, 100%);
        margin: 0 auto;
        border: 1px solid #bfd5d1;
        border-top: 5px solid #176f64;
        border-radius: 12px;
        padding: 20px;
        color: #172033;
        background: #ffffff;
        box-shadow: 0 24px 70px rgb(16 29 41 / 24%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system,
          BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .sf-consent-panel h2 {
        margin: 0;
        font-size: 1.35rem;
        line-height: 1.2;
      }

      .sf-consent-panel p {
        margin: 10px 0 0;
        color: #536171;
        line-height: 1.5;
      }

      .sf-consent-eyebrow {
        color: #176f64 !important;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .sf-consent-more {
        font-size: 0.87rem;
      }

      .sf-consent-panel a {
        color: #176f64;
        font-weight: 800;
      }

      .sf-consent-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: end;
        gap: 8px;
        margin-top: 17px;
      }

      .sf-consent-actions button,
      .sf-privacy-settings {
        min-height: 42px;
        border: 1px solid #b9d0cc;
        border-radius: 8px;
        padding: 9px 13px;
        color: #176f64;
        background: #f4faf8;
        font: inherit;
        font-weight: 850;
        cursor: pointer;
      }

      .sf-consent-actions .primary {
        border-color: #176f64;
        color: #ffffff;
        background: #176f64;
      }

      .sf-privacy-settings {
        min-height: auto;
        margin-left: auto;
        padding: 4px 8px;
        font-size: 0.78rem;
      }

      @media (max-width: 560px) {
        .sf-consent-layer {
          padding: 10px;
        }

        .sf-consent-panel {
          padding: 17px;
        }

        .sf-consent-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
      }

      @media print {
        .sf-consent-layer,
        .sf-privacy-settings {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function closeBanner() {
    document.querySelector(".sf-consent-layer")?.remove();
  }

  function openBanner() {
    injectStyles();
    closeBanner();

    const layer = document.createElement("div");
    layer.className = "sf-consent-layer";
    layer.innerHTML = bannerMarkup();

    layer
      .querySelector("[data-consent-accept]")
      ?.addEventListener("click", () => setConsent(ACCEPTED));

    layer
      .querySelector("[data-consent-reject]")
      ?.addEventListener("click", () => setConsent(REJECTED));

    document.body.appendChild(layer);
  }

  function addSettingsButton() {
    if (document.querySelector(".sf-privacy-settings")) {
      return;
    }

    const footer = document.querySelector("footer");
    if (!footer) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sf-privacy-settings";
    button.textContent = "Datenschutz-Einstellungen";
    button.addEventListener("click", openBanner);
    footer.appendChild(button);
  }

  function trackDownloadAction(element) {
    const action = element.dataset.downloadAction;
    if (!action || getConsent() !== ACCEPTED) {
      return;
    }

    loadClarity();
    queueClarity();
    window.clarity("event", action);
    window.clarity("set", "download_page", window.location.pathname);
  }

  document.addEventListener("click", (event) => {
    const element = event.target.closest("[data-download-action]");
    if (element) {
      trackDownloadAction(element);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    addSettingsButton();

    const consent = getConsent();

    if (consent === ACCEPTED) {
      loadClarity();
    } else if (consent !== REJECTED) {
      openBanner();
    }
  });

  window.schulferienklarPrivacy = {
    open: openBanner,
    reset() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
      openBanner();
    },
  };
})();
