async function updateBlockRules(sites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);

  const addRules = sites.map((site, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { extensionPath: '/newtab.html' }
    },
    condition: {
      urlFilter: `||${site}`,
      resourceTypes: ['main_frame']
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules
  });
}

async function init() {
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  await updateBlockRules(blockedSites);
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'updateBlockedSites') {
    const sites = message.sites || [];
    chrome.storage.local.set({ blockedSites: sites }).then(() => {
      return updateBlockRules(sites);
    }).then(() => {
      sendResponse({ ok: true });
    }).catch(err => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // keep channel open for async response
  }
});
