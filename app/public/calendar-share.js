/* Optional user-initiated sharing of the canonical page, independent of ads. */
(() => {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".sf-share-button");
    if (!button) return;
    const prompt = button.closest(".sf-share-prompt");
    const status = prompt?.querySelector(".sf-share-status");
    if (!status) return;
    const isEnglish = document.documentElement.lang === "en";
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const url = canonical || window.location.origin + window.location.pathname;
    const title = document.title;
    status.textContent = "";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        status.textContent = isEnglish ? "Thanks for sharing!" : "Danke fürs Teilen!";
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        status.textContent = isEnglish ? "Link copied!" : "Link kopiert!";
      } else {
        status.textContent = url;
      }
    } catch (error) {
      // Closing the native share sheet is not a failed user interaction.
      if (error?.name !== "AbortError") {
        status.textContent = isEnglish ? "Copy this link: " + url : "Link zum Kopieren: " + url;
      }
    }
  });
})();
