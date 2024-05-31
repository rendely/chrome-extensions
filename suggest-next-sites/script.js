
chrome.tabs.query({active: true, currentWindow: true},
    tabs => updateCurrent(tabs[0])
);

chrome.tabs.onActivated.addListener(refreshSuggest)

async function refreshSuggest(info){
    const tabId = info.tabId;
    const tab = await chrome.tabs.get(tabId);
    updateCurrent(tab)

}

function updateCurrent(tab){
    const current = document.getElementById('current');
    current.href = tab.url;
    current.innerText = tab.title;
}