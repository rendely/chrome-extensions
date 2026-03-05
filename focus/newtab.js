// ── Date heading ─────────────────────────────────────────────────────────────

function renderDate() {
  const now = new Date();
  const formatted = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('date-heading').textContent = formatted;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

async function loadTodos() {
  const { todos = [] } = await chrome.storage.local.get('todos');
  return todos;
}

let saveTimer = null;
function saveTodos() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const items = [...document.querySelectorAll('#todo-list li')].map(li => ({
      id: li.dataset.id,
      html: li.querySelector('.todo-text').innerHTML,
      done: li.querySelector('.todo-checkbox').checked
    }));
    chrome.storage.local.set({ todos: items });
  }, 400);
}

// ── Render todos ──────────────────────────────────────────────────────────────

function createTodoElement({ id, html = '', done = false }) {
  const li = document.createElement('li');
  li.dataset.id = id;
  if (done) li.classList.add('done');

  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.innerHTML = '⠿';
  handle.title = 'Drag to reorder';
  handle.addEventListener('mousedown', () => {
    li.draggable = true;
  });

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = done;
  checkbox.addEventListener('change', () => {
    li.classList.toggle('done', checkbox.checked);
    saveTodos();
  });

  const text = document.createElement('div');
  text.className = 'todo-text';
  text.contentEditable = 'true';
  text.innerHTML = html;
  text.dataset.placeholder = 'New task…';

  const del = document.createElement('button');
  del.className = 'delete-btn';
  del.innerHTML = '&times;';
  del.title = 'Delete';
  del.addEventListener('click', () => {
    li.remove();
    saveTodos();
  });

  text.addEventListener('keydown', handleTodoKeydown);
  text.addEventListener('input', handleTodoInput);
  text.addEventListener('mousedown', handleLinkClick);

  li.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    li.classList.add('dragging');
  });

  li.addEventListener('dragend', () => {
    li.draggable = false;
    li.classList.remove('dragging');
    document.querySelectorAll('#todo-list li').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    saveTodos();
  });

  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    if (!dragging || dragging === li) return;
    const midY = li.getBoundingClientRect().top + li.offsetHeight / 2;
    document.querySelectorAll('#todo-list li').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    li.classList.add(e.clientY < midY ? 'drag-over-top' : 'drag-over-bottom');
  });

  li.addEventListener('drop', (e) => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    if (!dragging || dragging === li) return;
    const midY = li.getBoundingClientRect().top + li.offsetHeight / 2;
    const list = document.getElementById('todo-list');
    if (e.clientY < midY) {
      list.insertBefore(dragging, li);
    } else {
      list.insertBefore(dragging, li.nextSibling);
    }
    document.querySelectorAll('#todo-list li').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  li.append(handle, checkbox, text, del);
  return li;
}

async function renderTodos() {
  const todos = await loadTodos();
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  if (todos.length === 0) {
    const li = createTodoElement({ id: genId() });
    list.appendChild(li);
  } else {
    todos.forEach(t => list.appendChild(createTodoElement(t)));
  }
}

function addTodo(afterLi = null) {
  const list = document.getElementById('todo-list');
  const li = createTodoElement({ id: genId() });
  if (afterLi && afterLi.nextSibling) {
    list.insertBefore(li, afterLi.nextSibling);
  } else {
    list.appendChild(li);
  }
  li.querySelector('.todo-text').focus();
  saveTodos();
  return li;
}

// ── Keyboard handling ─────────────────────────────────────────────────────────

function handleTodoKeydown(e) {
  const li = e.target.closest('li');

  if (e.key === 'Enter') {
    e.preventDefault();
    hideTabPicker();
    addTodo(li);
  }

  if (e.key === 'Backspace') {
    if (e.target.textContent === '' && e.target.innerHTML === '') {
      e.preventDefault();
      hideTabPicker();
      const list = document.getElementById('todo-list');
      const items = [...list.querySelectorAll('li')];
      const idx = items.indexOf(li);
      li.remove();
      saveTodos();
      const prev = items[idx - 1] || items[idx + 1];
      if (prev) prev.querySelector('.todo-text').focus();
    }
  }

  if (e.key === 'Escape') {
    hideTabPicker();
  }

  if (e.key === 'ArrowDown' && isTabPickerVisible()) {
    e.preventDefault();
    moveTabPickerSelection(1);
  }

  if (e.key === 'ArrowUp' && isTabPickerVisible()) {
    e.preventDefault();
    moveTabPickerSelection(-1);
  }

  if (e.key === 'Tab' && isTabPickerVisible()) {
    e.preventDefault();
    confirmTabPickerSelection();
  }
}

function handleTodoInput(e) {
  saveTodos();
  checkAtMention(e.target);
}

// ── Link click handler ────────────────────────────────────────────────────────

function handleLinkClick(e) {
  const link = e.target.closest('.tab-link');
  if (!link) return;
  e.preventDefault();
  const tabId = parseInt(link.dataset.tabId, 10);
  if (tabId) {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        window.open(link.href, '_blank');
      } else {
        chrome.tabs.update(tabId, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      }
    });
  } else {
    window.open(link.href, '_blank');
  }
}

// ── @ Tab mention ─────────────────────────────────────────────────────────────

let currentAtRange = null;
let currentAtElement = null;
let allTabs = [];
let tabPickerItems = [];
let tabPickerIndex = -1;

function getAtMentionState(element) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  if (!element.contains(range.startContainer)) return null;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent.slice(0, range.startOffset);
  const atIdx = text.lastIndexOf('@');
  if (atIdx === -1) return null;

  const afterAt = text.slice(atIdx + 1);
  if (/\s/.test(afterAt)) return null;

  const query = afterAt;
  const r = document.createRange();
  r.setStart(node, atIdx);
  r.setEnd(node, range.startOffset);

  return { query, range: r };
}

async function checkAtMention(element) {
  const state = getAtMentionState(element);
  if (!state) {
    hideTabPicker();
    return;
  }

  currentAtRange = state.range;
  currentAtElement = element;

  const tabs = await chrome.tabs.query({});
  const q = state.query.toLowerCase();
  allTabs = tabs.filter(t =>
    t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q)
  ).slice(0, 8);

  if (allTabs.length === 0) {
    hideTabPicker();
    return;
  }

  showTabPicker(state.range, allTabs);
}

function showTabPicker(range, tabs) {
  const picker = document.getElementById('tab-picker');
  const list = document.getElementById('tab-picker-list');
  list.innerHTML = '';
  tabPickerItems = tabs;
  tabPickerIndex = 0;

  tabs.forEach((tab, i) => {
    const li = document.createElement('li');
    if (i === 0) li.classList.add('active');

    const title = document.createElement('div');
    title.textContent = tab.title || tab.url;

    const url = document.createElement('div');
    url.className = 'tab-url';
    try { url.textContent = new URL(tab.url).hostname; } catch { url.textContent = ''; }

    li.append(title, url);
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      insertTabLink(currentAtRange, tab);
      hideTabPicker();
    });
    list.appendChild(li);
  });

  // Position near cursor
  const rect = range.getBoundingClientRect();
  picker.style.left = `${rect.left}px`;
  picker.style.top = `${rect.bottom + 6}px`;
  picker.classList.remove('hidden');
}

function hideTabPicker() {
  document.getElementById('tab-picker').classList.add('hidden');
  currentAtRange = null;
  currentAtElement = null;
  tabPickerItems = [];
  tabPickerIndex = -1;
}

function isTabPickerVisible() {
  return !document.getElementById('tab-picker').classList.contains('hidden');
}

function moveTabPickerSelection(delta) {
  const items = document.querySelectorAll('#tab-picker-list li');
  if (!items.length) return;
  items[tabPickerIndex]?.classList.remove('active');
  tabPickerIndex = Math.max(0, Math.min(tabPickerIndex + delta, items.length - 1));
  items[tabPickerIndex]?.classList.add('active');
  items[tabPickerIndex]?.scrollIntoView({ block: 'nearest' });
}

function confirmTabPickerSelection() {
  if (tabPickerIndex >= 0 && tabPickerItems[tabPickerIndex]) {
    insertTabLink(currentAtRange, tabPickerItems[tabPickerIndex]);
    hideTabPicker();
  }
}

function insertTabLink(range, tab) {
  if (!range) return;

  range.deleteContents();

  const link = document.createElement('a');
  link.className = 'tab-link';
  link.dataset.tabId = tab.id;
  link.href = tab.url;
  link.contentEditable = 'false';
  link.textContent = tab.title || tab.url;

  const space = document.createTextNode('\u00a0');

  range.insertNode(space);
  range.insertNode(link);

  // Move cursor after the space
  const sel = window.getSelection();
  const newRange = document.createRange();
  newRange.setStartAfter(space);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  saveTodos();
}

// ── Settings panel ────────────────────────────────────────────────────────────

document.getElementById('settings-btn').addEventListener('click', async () => {
  const panel = document.getElementById('settings-panel');
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);

  if (isHidden) {
    const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
    document.getElementById('blocked-sites-input').value = blockedSites.join('\n');
  }
});

document.getElementById('settings-save-btn').addEventListener('click', async () => {
  const raw = document.getElementById('blocked-sites-input').value;
  const sites = raw.split('\n').map(s => s.trim()).filter(Boolean);
  await chrome.storage.local.set({ blockedSites: sites });
  chrome.runtime.sendMessage({ type: 'updateBlockedSites', sites });
  document.getElementById('settings-panel').classList.add('hidden');
});

// Close settings when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('settings-panel');
  const btn = document.getElementById('settings-btn');
  if (!panel.contains(e.target) && e.target !== btn) {
    panel.classList.add('hidden');
  }
});

// ── Add task button ───────────────────────────────────────────────────────────

document.getElementById('add-task-btn').addEventListener('click', () => {
  addTodo();
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderDate();
renderTodos();
