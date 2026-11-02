// One unobtrusive manual AdSense placement on information-rich static pages.
// The shared AdSense loader and Google CMP are already included by the templates.
(() => {
  "use strict";

  const SLOT = "9291651091"; // Existing Schulferienklar-InContent-01 unit.
  const CLIENT = "ca-pub-8336348698974993";

  function selectAnchor() {
    if (document.body.classList.contains("static-page")) {
      return document.querySelector("[data-sf-ad-before]");
    }
    if (!document.body.classList.contains("seo-page")) return null;

    // Vacation-planner examples come first; never interrupt the tool itself.
    if (document.body.classList.contains("planner-body")) {
      return document.querySelector(".planner-page #beispiele");
    }

    // On detailed holiday pages, the official dates remain the first content.
    const mainCard = document.querySelector("main > .card");
    if (!mainCard) return null;
    return mainCard.querySelector("#termine") ||
      mainCard.querySelector(".holiday-summary-list");
  }

  function insertAd() {
    if (document.querySelector(".sf-content-ad")) return;
    const anchor = selectAnchor();
    if (!anchor || !anchor.parentElement) return;

    let placementAnchor = anchor;
    let parent = anchor.parentElement;
    let style = window.getComputedStyle(parent);
    let availableWidth = parent.clientWidth -
      (parseFloat(style.paddingLeft) || 0) -
      (parseFloat(style.paddingRight) || 0);

    // If a mobile card is too narrow, place a small banner after the card
    // rather than overflowing the official holiday dates or controls.
    if (availableWidth < 300) {
      const card = anchor.closest("main > .card");
      if (!card || !card.parentElement) return;
      placementAnchor = card;
      parent = card.parentElement;
      style = window.getComputedStyle(parent);
      availableWidth = parent.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0);
    }
    if (availableWidth < 300) return;
    const size = availableWidth >= 728
      ? { width: 728, height: 90 }
      : availableWidth >= 468
        ? { width: 468, height: 60 }
        : availableWidth >= 320
          ? { width: 320, height: 100 }
          : { width: 300, height: 50 };

    const wrapper = document.createElement("aside");
    wrapper.className = "sf-content-ad";
    wrapper.setAttribute("aria-label", "Werbung");

    const label = document.createElement("span");
    label.className = "sf-content-ad-label";
    label.textContent = "Anzeige";

    const unit = document.createElement("ins");
    unit.className = "adsbygoogle sf-content-ad-unit";
    unit.style.display = "block";
    unit.style.width = size.width + "px";
    unit.style.height = size.height + "px";
    unit.setAttribute("data-ad-client", CLIENT);
    unit.setAttribute("data-ad-slot", SLOT);

    wrapper.append(label, unit);
    placementAnchor.insertAdjacentElement(
      anchor.hasAttribute("data-sf-ad-before") ? "beforebegin" : "afterend", wrapper
    );

    const debug = new URLSearchParams(window.location.search).get("ads_debug") === "1";
    if (debug) wrapper.classList.add("sf-content-ad-debug");
    let requestError = "";
    let requestState = "not-started";
    let report = () => {};

    if (debug) {
      const diagnostic = document.createElement("code");
      diagnostic.className = "sf-ad-diagnostic";
      diagnostic.setAttribute("role", "status");
      diagnostic.textContent = "Checking AdSense…";
      wrapper.appendChild(diagnostic);

      report = () => {
        const rect = unit.getBoundingClientRect();
        const processing = unit.getAttribute("data-adsbygoogle-status") || "pending";
        const status = unit.getAttribute("data-ad-status") || "pending";
        const loader = document.querySelector('script[data-schulferienklar-adsense="true"]');
        const api = typeof window.adsbygoogle === "undefined" ? "not-loaded" : "available";
        diagnostic.textContent =
          `Ad: ${status} · Processing: ${processing} · Request: ${requestState} · ` +
          `Size: ${Math.round(rect.width)}×${Math.round(rect.height)}px · ` +
          `Loader: ${loader ? "present" : "missing"} · API: ${api}` +
          (requestError ? ` · Error: ${requestError}` : "");
      };

      const observer = new MutationObserver(report);
      observer.observe(unit, {
        attributes: true,
        attributeFilter: ["data-ad-status", "data-adsbygoogle-status", "style"],
      });
      const loader = document.querySelector('script[data-schulferienklar-adsense="true"]');
      loader?.addEventListener("load", report, { once: true });
      loader?.addEventListener("error", () => {
        requestError = "AdSense loader failed";
        report();
      }, { once: true });
      window.setTimeout(report, 6000);
      window.setTimeout(report, 14000);
    }

    const request = () => {
      if (!unit.isConnected || !unit.getClientRects().length) {
        requestState = "no-visible-layout";
        report();
        return;
      }
      requestState = "submitted";
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        requestError = String(error?.message || error).slice(0, 160);
      }
      report();
    };

    // An injected static-page ad must be laid out before being submitted to
    // AdSense. The older immediate push could happen before the browser had
    // calculated its display size. Existing SEO-page behavior stays unchanged.
    if (document.body.classList.contains("static-page")) {
      window.requestAnimationFrame(request);
    } else {
      request();
    }

    // A second opportunity only exists on long, substantive pages.
    // It must not compete with the first ad or create hidden ad elements.
    setupLongPageAd(unit);
  }

  function setupLongPageAd(firstUnit) {
    let anchor = null;
    if (document.body.classList.contains("planner-body")) {
      anchor = document.querySelector(".planner-page #bundeslaender");
    } else {
      anchor = document.querySelector("main > .card[data-gold-page] #berechnung");
    }
    if (!anchor || !("IntersectionObserver" in window) ||
        !("MutationObserver" in window)) return;

    const sentinel = document.createElement("div");
    sentinel.className = "sf-content-ad-sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    anchor.insertAdjacentElement("afterend", sentinel);

    let approaching = false;
    let inserted = false;
    let statusObserver;

    const mountAd = () => {
      if (!approaching || inserted || !sentinel.isConnected ||
          firstUnit.getAttribute("data-adsbygoogle-status") !== "done") return;
      inserted = true;
      statusObserver?.disconnect();

      const parent = sentinel.parentElement;
      const computed = window.getComputedStyle(parent);
      const width = parent.clientWidth -
        (parseFloat(computed.paddingLeft) || 0) -
        (parseFloat(computed.paddingRight) || 0);
      if (width < 300) return;
      const size = width >= 728
        ? { width: 728, height: 90 }
        : width >= 468
          ? { width: 468, height: 60 }
          : width >= 320
            ? { width: 320, height: 100 }
            : { width: 300, height: 50 };

      const wrapper = document.createElement("aside");
      wrapper.className = "sf-content-ad sf-content-ad-extra";
      wrapper.setAttribute("aria-label", "Werbung");
      const label = document.createElement("span");
      label.className = "sf-content-ad-label";
      label.textContent = "Anzeige";
      const unit = document.createElement("ins");
      unit.className = "adsbygoogle sf-content-ad-unit";
      unit.style.display = "block";
      unit.style.width = size.width + "px";
      unit.style.height = size.height + "px";
      unit.setAttribute("data-ad-client", CLIENT);
      unit.setAttribute("data-ad-slot", SLOT);
      wrapper.append(label, unit);
      sentinel.replaceWith(wrapper);

      window.requestAnimationFrame(() => {
        if (!unit.isConnected || !unit.getClientRects().length) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // An ad that does not serve must never interfere with page content.
        }
      });
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      approaching = true;
      observer.disconnect();
      mountAd();
      if (!inserted) {
        statusObserver = new MutationObserver(mountAd);
        statusObserver.observe(firstUnit, {
          attributes: true,
          attributeFilter: ["data-adsbygoogle-status"],
        });
        mountAd();
      }
    }, { rootMargin: "350px 0px" });
    observer.observe(sentinel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertAd, { once: true });
  } else {
    insertAd();
  }
})();
