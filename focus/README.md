# Focus

A minimal Chrome extension that replaces the new tab page with a calm to-do list.

## Features

- **To-do list** — Add, check off, and delete tasks. Persists across sessions.
- **@ Tab mentions** — Type `@` in any task to search open tabs and insert an inline link. Clicking the link switches to that tab (or opens the URL if it's been closed).
- **Site blocking** — Redirect any domain to your to-do list. Configure via the settings gear.

## Installation

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `focus/` directory

## Usage

- **Enter** — Add a new task below the current one
- **Backspace** on an empty task — Delete it and focus the previous
- **@** — Open the tab picker; use arrow keys to navigate, Tab or click to insert
- **Gear icon** (bottom right) — Open settings to manage blocked sites (one domain per line)
