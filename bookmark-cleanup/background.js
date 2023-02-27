// Open the extension's page when the icon is clicked in the toolbar
chrome.action.onClicked.addListener(function (tab) {
  chrome.tabs.create({
    url: 'bookmark_cleanup.html',
    selected: true,
  })
})