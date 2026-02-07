const queryInput = document.getElementById("query");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const emptyEl = document.getElementById("empty");
const detailEl = document.getElementById("detail");
const detailTitleEl = document.getElementById("detail-title");
const detailUrlEl = document.getElementById("detail-url");
const detailViewsEl = document.getElementById("detail-views");
const detailContentEl = document.getElementById("detail-content");
const openSourceBtn = document.getElementById("open-source");

let currentResults = [];
let selectedUrl = "";

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function showDetail(page) {
  selectedUrl = page.url;

  detailTitleEl.textContent = page.title || page.url;
  detailUrlEl.textContent = page.url;
  detailViewsEl.textContent = `Views: ${page.views || 0}`;
  detailContentEl.textContent = page.content || "";
  emptyEl.hidden = true;
  detailEl.hidden = false;

  for (const item of resultsEl.querySelectorAll(".result")) {
    item.classList.toggle("active", item.dataset.url === selectedUrl);
  }
}

function renderResults(results) {
  currentResults = results;
  resultsEl.innerHTML = "";

  if (!results.length) {
    statusEl.textContent = "No matches";
    emptyEl.hidden = false;
    detailEl.hidden = true;
    selectedUrl = "";
    return;
  }

  statusEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;

  for (const page of results) {
    const item = document.createElement("li");
    item.className = "result";
    item.dataset.url = page.url;

    const title = document.createElement("p");
    title.className = "result-title";
    title.textContent = page.title || page.url;

    const url = document.createElement("p");
    url.className = "result-url";
    url.textContent = page.url;

    const meta = document.createElement("p");
    meta.className = "result-meta";
    meta.textContent = `Views: ${page.views || 0}`;

    const snippet = document.createElement("p");
    snippet.className = "result-snippet";
    snippet.textContent = (page.content || "").slice(0, 220);

    item.append(title, url, meta, snippet);
    item.addEventListener("click", () => showDetail(page));

    resultsEl.appendChild(item);
  }

  const stillExists = selectedUrl && results.some((page) => page.url === selectedUrl);
  if (stillExists) {
    const selected = results.find((page) => page.url === selectedUrl);
    if (selected) {
      showDetail(selected);
      return;
    }
  }

  showDetail(results[0]);
}

let timer;
async function refreshResults() {
  const query = queryInput.value.trim();
  statusEl.textContent = "Searching...";

  try {
    const response = await sendMessage({ type: "SEARCH", query, limit: 100 });
    if (!response?.ok) {
      throw new Error(response?.error || "Search failed");
    }

    renderResults(response.results || []);
  } catch (error) {
    statusEl.textContent = error.message;
    resultsEl.innerHTML = "";
    emptyEl.hidden = false;
    detailEl.hidden = true;
  }
}

queryInput.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(refreshResults, 120);
});

openSourceBtn.addEventListener("click", () => {
  const selected = currentResults.find((page) => page.url === selectedUrl);
  if (selected) {
    window.open(selected.url, "_blank", "noopener,noreferrer");
  }
});

refreshResults();
