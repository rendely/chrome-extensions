# Recall MVP Chrome Extension

This extension captures a readable text snapshot of each visited page and stores it in IndexedDB. It also builds a FlexSearch index for fast keyword search in a full extension tab.

## Features

- On every page load, extract main visible page content with a manual DOM heuristic extractor.
- Re-capture on SPA route changes (`history.pushState`, `replaceState`, `popstate`, `hashchange`).
- Re-capture after user interactions (`click`, `scroll`) and lazy DOM updates (mutation observer), with throttling/dedupe to reduce redundant writes.
- Upsert by URL in IndexedDB (`url`, `title`, `views`, `content`, `updatedAt`).
- Increment `views` each time a page is captured.
- Click the extension icon to open a full search tab.
- Search stored pages quickly with FlexSearch and view full content in a right-side pane.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.

## Notes

- The first search may be empty until pages are visited.
- Some restricted pages (e.g. Chrome internal pages) cannot be captured.
