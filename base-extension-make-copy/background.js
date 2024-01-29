// Run when extension loads
chrome.runtime.onInstalled.addListener(function () {
  console.log('Updating badge');
  chrome.action.setBadgeText({"text": "Update"} );
  //timeout function
  setTimeout(function(){    
    chrome.action.setBadgeText({"text": ""} );
  }, 2000);
});

chrome.tabGroups.onUpdated.addListener( function(group){
  console.log(group)
}
)
chrome.bookmarks.getTree(
  results => console.log(results)
)

chrome.bookmarks.create(
  {title: 'My bookmarks folder'}
)

chrome.bookmarks.search(
  'matthew.com', (node) => {console.log(node)}
)

chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
  //  if (changeInfo.status === 'complete' || changeInfo.groupId !== undefined)
    console.log(tabId, changeInfo, tab)
    chrome.tabs.query({}, function(tabs){console.log(tabs)})
  }
)

chrome.tabs.onMoved.addListener(
  (tabId, moveInfo)=> {
    console.log(moveInfo)
  }
)