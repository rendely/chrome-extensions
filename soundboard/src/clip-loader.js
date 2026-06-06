(function loadPackagedClips() {
  "use strict";

  const MESSAGE_SOURCE = "meet-virtual-soundboard-extension";
  let packagedClips = null;
  let loadError = null;

  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.origin === window.location.origin &&
      event.data?.source === MESSAGE_SOURCE &&
      event.data?.type === "request-packaged-clips"
    ) {
      if (packagedClips) {
        announceClips(packagedClips);
      } else if (loadError) {
        announceError(loadError);
      }
    }
  });

  function announceClips(clips) {
    window.postMessage({
      source: MESSAGE_SOURCE,
      type: "packaged-clips",
      clips
    }, "*");
  }

  function announceError(message) {
    window.postMessage({
      source: MESSAGE_SOURCE,
      type: "packaged-clips-error",
      message
    }, "*");
  }

  async function loadCatalog() {
    try {
      const response = await fetch(chrome.runtime.getURL("clips/index.json"));
      if (!response.ok) {
        throw new Error(`Clip catalog returned HTTP ${response.status}`);
      }

      const paths = await response.json();
      if (!Array.isArray(paths)) {
        throw new Error("Clip catalog is not an array");
      }

      packagedClips = paths
        .filter((path) => typeof path === "string" && path.startsWith("clips/"))
        .map((path) => ({
          name: path.split("/").pop(),
          path,
          url: chrome.runtime.getURL(path)
        }));
      announceClips(packagedClips);
    } catch (error) {
      loadError = error?.message || String(error);
      console.error("[Soundboard] Could not load clip catalog.", error);
      announceError(loadError);
    }
  }

  loadCatalog();
})();
