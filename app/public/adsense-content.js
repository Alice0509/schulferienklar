// One unobtrusive manual AdSense placement on information-rich static pages.
// The shared AdSense loader and Google CMP are already included by the templates.
(() => {
  "use strict";

  const SLOT = "9291651091"; // Existing Schulferienklar-InContent-01 unit.
  const CLIENT = "ca-pub-8336348698974993";

  function selectAnchor() {
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

    const parent = anchor.parentElement;
    const style = window.getComputedStyle(parent);
    const availableWidth = parent.clientWidth -
      (parseFloat(style.paddingLeft) || 0) -
      (parseFloat(style.paddingRight) || 0);

    // Keep narrow screens and tightly constrained cards completely ad-free.
    if (availableWidth < 320) return;
    const size = availableWidth >= 728
      ? { width: 728, height: 90 }
      : availableWidth >= 468
        ? { width: 468, height: 60 }
        : { width: 320, height: 100 };

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
    anchor.insertAdjacentElement("afterend", wrapper);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // No ad fill or an ad blocker must not interrupt holiday information.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertAd, { once: true });
  } else {
    insertAd();
  }
})();
