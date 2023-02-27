# Bookmark Cleanup Product Specifications

## Features

### A: Archive existing bookmarks

- [ ] A1: Archive all bookmarks into a single "ARCHIVE" folder, disregard current folder structure
- [ ] A2: Same as A1, but keep the folder structure
- [ ] A3: Remove duplicates as option for A1, A2
- [ ] A4: Sort by: recency, title, N/A for A1, A2
- [ ] A5: Undo after archiving to return to the prior state

### B: Organize bookmarks

- [ ] B1: Move bookmarks not in a folder into existing folders
- [ ] B2: Create N folders and organize bookmarks into those folders, top level of folders only
- [ ] B3: Power B1, and B2 with OpenAI embeddings API
- [ ] B4: User must be able to add their API key
- [ ] B5: Undo after organizing to return to the prior state
- [ ] B6: Create N folders and organize via clustering within any arbitrary subfolder

### C: Create Smart Bookmarks

- [ ] C1: Find and display history visits that are likely to be good bookmark candidates
  - [ ] TBD: Rule 1
  - [ ] TBD: Rule 2
  - [ ] TBD: Rule 3
- [ ] C2: One by one or batch create those smart bookmarks

## User flows

- Tap extension icon to open a tab with the Bookmark Cleanup app
- Several buttons available:
  - Archive All (flatten)
  - Archive All (keep folders)
  - Organize (use existing folders)
  - Organize (create new folders)
  - Suggest bookmarks

- Tapping either of the Archive buttons immediately performs the action and the button changes to "Undo". The undo is available until the page is closed OR any further changes are made to the bookmarks (via a listener)
- Tapping the Organize (use existing folders) will immediately move bookmarks to existing folders. Optionally: show a preview of where bookmarks were moved to?
- TBD the other flows

## Eng design

### bookmark_cleanup.html

- Sticky header:
  - Title
  - Description of how to use extension
- 3 sections stacked vertically
  - Section title
  - Large action buttons with description of what they do
  - Hidden div for previewing results

### bookmark_cleanup.js
