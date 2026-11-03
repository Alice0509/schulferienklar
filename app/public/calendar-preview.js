/* Progressive enhancement for the visual state/year calendar. */
(() => {
  if (!("showPopover" in HTMLElement.prototype)) return;
  document.addEventListener("click", (event) => {
    const close = event.target.closest(".sf-preview-close");
    if (close) {
      close.closest(".sf-date-preview")?.hidePopover();
      return;
    }
    const link = event.target.closest("a[data-sf-preview-date]");
    if (!link) return;
    const calendar = link.closest(".sf-year-visual");
    const preview = calendar?.querySelector(".sf-date-preview");
    if (!preview) return;
    event.preventDefault();
    preview.querySelector(".sf-preview-date").textContent = link.dataset.sfPreviewDate || "";
    preview.querySelector(".sf-preview-name").textContent = link.dataset.sfPreviewName || "";
    preview.querySelector(".sf-preview-range").textContent = link.dataset.sfPreviewRange || "";
    const publicInfo = preview.querySelector(".sf-preview-public");
    const publicName = link.dataset.sfPreviewPublic || "";
    publicInfo.hidden = !publicName;
    publicInfo.textContent = publicName
      ? (document.documentElement.lang === "en" ? "Public holiday: " : "Feiertag: ") + publicName
      : "";
    preview.querySelector(".sf-preview-link").href = link.getAttribute("href");
    preview.showPopover();
  });
})();
