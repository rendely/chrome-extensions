importScripts("vendor/flexsearch.bundle.min.js");

const DB_NAME = "recall-db";
const DB_VERSION = 1;
const STORE_NAME = "pages";
const MAX_CONTENT_LENGTH = 200000;

const pageCache = new Map();
const searchIndex = new FlexSearch.Index({
  preset: "match",
  tokenize: "forward",
  cache: 100
});

let dbPromise;
const readyPromise = initialize();
const SEARCH_PAGE_URL = chrome.runtime.getURL("search.html");

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function initialize() {
  await openDatabase();
  const allPages = await dbGetAll();

  for (const page of allPages) {
    pageCache.set(page.url, page);
    searchIndex.add(page.url, toSearchText(page));
  }
}

function dbTransaction(mode, operation) {
  return openDatabase().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = operation(store);

      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || request?.error);
      tx.onabort = () => reject(tx.error || request?.error);
    })
  );
}

function dbGet(url) {
  return dbTransaction("readonly", (store) => store.get(url));
}

function dbGetAll() {
  return dbTransaction("readonly", (store) => store.getAll());
}

function dbPut(record) {
  return dbTransaction("readwrite", (store) => store.put(record));
}

function truncateContent(text) {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .slice(0, MAX_CONTENT_LENGTH);
}

function toSearchText(page) {
  return `${page.title || ""}\n${page.content || ""}`;
}

async function upsertPage(payload) {
  const url = payload?.url;
  if (!url) {
    throw new Error("Missing URL");
  }

  const existing = await dbGet(url);
  const next = {
    url,
    title: payload.title || existing?.title || url,
    views: (existing?.views || 0) + 1,
    content: truncateContent(payload.content || existing?.content || ""),
    updatedAt: Date.now()
  };

  await dbPut(next);

  if (existing) {
    searchIndex.remove(url);
  }

  pageCache.set(url, next);
  searchIndex.add(url, toSearchText(next));

  return next;
}

async function searchPages(query, limit = 20) {
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const trimmed = (query || "").trim();

  if (!trimmed) {
    return Array.from(pageCache.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, normalizedLimit);
  }

  const urls = searchIndex.search(trimmed, normalizedLimit);
  const results = [];

  for (const url of urls) {
    const record = pageCache.get(String(url));
    if (record) {
      results.push(record);
    }
  }

  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    await readyPromise;

    if (message?.type === "UPSERT_PAGE") {
      const page = await upsertPage(message.payload);
      sendResponse({ ok: true, page });
      return;
    }

    if (message?.type === "SEARCH") {
      const results = await searchPages(message.query, message.limit);
      sendResponse({ ok: true, results });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: SEARCH_PAGE_URL });
});
