(function () {
  const MAX_CONTENT_LENGTH = 200000;
  const CLICK_CAPTURE_DELAY_MS = 1000;
  const SCROLL_CAPTURE_DEBOUNCE_MS = 1500;
  const MUTATION_CAPTURE_DEBOUNCE_MS = 2000;
  const URL_CHANGE_CAPTURE_DELAY_MS = 700;
  const MIN_CAPTURE_INTERVAL_MS = 2500;

  let lastCaptureAt = 0;
  let lastSignature = "";
  let lastKnownUrl = location.href;
  let clickTimer = null;
  let scrollTimer = null;
  let mutationTimer = null;
  let urlChangeTimer = null;

  function isSupportedDocument() {
    return location.protocol.startsWith("http") && document.contentType?.includes("text/html");
  }

  function buildSignature(payload) {
    const content = payload.content || "";
    const prefix = content.slice(0, 500);
    const suffix = content.slice(-500);
    return `${payload.url}|${payload.title}|${content.length}|${prefix}|${suffix}`;
  }

  function normalizeText(text) {
    return (text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim()
      .slice(0, MAX_CONTENT_LENGTH);
  }

  const BOILERPLATE_SELECTORS = [
    "nav",
    "footer",
    "header",
    "aside",
    ".sidebar",
    ".menu",
    ".ads",
    ".advertisement",
    ".social-share",
    ".comments",
    "form",
    "script",
    "style",
    "noscript",
    "iframe"
  ];

  const BLOCK_TAGS = new Set([
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "BR",
    "DD",
    "DIV",
    "DL",
    "DT",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "HR",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "TD",
    "TH",
    "TR",
    "UL"
  ]);

  function isBoilerplate(el) {
    return BOILERPLATE_SELECTORS.some((selector) => {
      try {
        return el.matches(selector);
      } catch (_error) {
        return false;
      }
    });
  }

  function isVisibleElement(el) {
    if (!(el instanceof Element)) {
      return false;
    }

    if (el.hidden || el.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(el);
    if (!style || style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
      return false;
    }

    if (Number(style.opacity) === 0) {
      return false;
    }

    return true;
  }

  function appendText(buffer, text) {
    if (!text) {
      return buffer;
    }

    if (!buffer) {
      return text;
    }

    if (/\s$/.test(buffer) || /^\s/.test(text)) {
      return `${buffer}${text}`;
    }

    return `${buffer} ${text}`;
  }

  function extractStructuredVisibleText(root) {
    const lines = [];
    let currentLine = "";

    function flushLine() {
      const line = currentLine.trim();
      if (line) {
        lines.push(line);
      }
      currentLine = "";
    }

    function walk(node) {
      if (!node) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/[^\S\n]+/g, " ").trim();
        if (text) {
          currentLine = appendText(currentLine, text);
        }
        return;
      }

      if (!(node instanceof Element)) {
        return;
      }

      if (!isVisibleElement(node) || isBoilerplate(node)) {
        return;
      }

      const isBlock = BLOCK_TAGS.has(node.tagName);
      if (isBlock) {
        flushLine();
      }

      for (const child of node.childNodes) {
        walk(child);
      }

      if (isBlock) {
        flushLine();
      }
    }

    walk(root);
    flushLine();

    return lines.join("\n");
  }

  function findBestCandidate(body) {
    const candidates = body.querySelectorAll("main, article, section, div");
    let bestCandidate = body;
    let maxScore = 0;

    for (const el of candidates) {
      if (!isVisibleElement(el) || isBoilerplate(el)) {
        continue;
      }

      const textLength = (el.innerText || "").trim().length;
      if (textLength < 200) {
        continue;
      }

      const paragraphs = el.querySelectorAll("p").length;
      const score = textLength * (paragraphs + 1);
      if (score > maxScore) {
        maxScore = score;
        bestCandidate = el;
      }
    }

    return bestCandidate;
  }

  function extractText() {
    const title = (document.title || location.href).trim();
    const body = document.body;
    const candidate = body ? findBestCandidate(body) : null;
    const extracted = candidate ? extractStructuredVisibleText(candidate) : "";
    const fallback = document.body?.innerText || "";
    const text = normalizeText(extracted || fallback);

    return {
      url: location.href,
      title,
      content: text
    };
  }

  function capturePage(force = false) {
    if (!isSupportedDocument()) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastCaptureAt < MIN_CAPTURE_INTERVAL_MS) {
      return;
    }

    let payload;
    try {
      payload = extractText();
    } catch (_error) {
      payload = {
        url: location.href,
        title: document.title || location.href,
        content: normalizeText(document.body?.innerText || "")
      };
    }

    const signature = buildSignature(payload);
    if (!force && signature === lastSignature) {
      return;
    }

    lastCaptureAt = now;
    lastSignature = signature;

    chrome.runtime.sendMessage({ type: "UPSERT_PAGE", payload }, () => {
      void chrome.runtime.lastError;
    });
  }

  function scheduleCapture(delay, force = false, timerName = "click") {
    const timerMap = {
      click: clickTimer,
      scroll: scrollTimer,
      mutation: mutationTimer,
      url: urlChangeTimer
    };

    const timer = timerMap[timerName];
    if (timer) {
      clearTimeout(timer);
    }

    const nextTimer = setTimeout(() => {
      if (timerName === "click") {
        clickTimer = null;
      } else if (timerName === "scroll") {
        scrollTimer = null;
      } else if (timerName === "mutation") {
        mutationTimer = null;
      } else if (timerName === "url") {
        urlChangeTimer = null;
      }

      capturePage(force);
    }, delay);

    if (timerName === "click") {
      clickTimer = nextTimer;
    } else if (timerName === "scroll") {
      scrollTimer = nextTimer;
    } else if (timerName === "mutation") {
      mutationTimer = nextTimer;
    } else if (timerName === "url") {
      urlChangeTimer = nextTimer;
    }
  }

  function onUrlMaybeChanged() {
    if (location.href === lastKnownUrl) {
      return;
    }

    lastKnownUrl = location.href;
    scheduleCapture(URL_CHANGE_CAPTURE_DELAY_MS, true, "url");
  }

  function installSpaRouteListeners() {
    const wrapHistoryMethod = (methodName) => {
      const original = history[methodName];
      if (typeof original !== "function") {
        return;
      }

      history[methodName] = function (...args) {
        const result = original.apply(this, args);
        onUrlMaybeChanged();
        return result;
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");

    window.addEventListener("popstate", onUrlMaybeChanged);
    window.addEventListener("hashchange", onUrlMaybeChanged);
  }

  function installInteractionListeners() {
    window.addEventListener(
      "click",
      () => {
        scheduleCapture(CLICK_CAPTURE_DELAY_MS, false, "click");
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "scroll",
      () => {
        scheduleCapture(SCROLL_CAPTURE_DEBOUNCE_MS, true, "scroll");
      },
      { passive: true }
    );

    const observer = new MutationObserver(() => {
      scheduleCapture(MUTATION_CAPTURE_DEBOUNCE_MS, false, "mutation");
      onUrlMaybeChanged();
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  installSpaRouteListeners();
  installInteractionListeners();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => capturePage(true), { once: true });
  } else {
    capturePage(true);
  }
})();
