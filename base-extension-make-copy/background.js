// Run when extension loads
chrome.runtime.onInstalled.addListener(function () {
  console.log('Updating badge');
  chrome.action.setBadgeText({"text": "Update"} );
  //timeout function
  setTimeout(function(){    
    chrome.action.setBadgeText({"text": ""} );
  }, 2000);
});
