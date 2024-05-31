chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});