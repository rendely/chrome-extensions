currentTabId = undefined;

chrome.tabs.query({active: true, currentWindow: true},
    tabs => updateCurrent(tabs[0])
);

chrome.tabs.onActivated.addListener(info => refreshSuggest(info.tabId))

chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (tabId === currentTabId) refreshSuggest(tabId) });

getAllHistory();

async function refreshSuggest(tabId){
    currentTabId = tabId;
    const tab = await chrome.tabs.get(tabId);
    updateCurrent(tab);
}

function updateCurrent(tab){
    currentTabId = tab.id;
    const current = document.getElementById('current');
    current.href = tab.url;
    current.innerText = tab.title;
}

async function getAllHistory(){
    const all_history = await chrome.history.search(
        {text: "", maxResults: 10000, startTime: 0});
    showSites(all_history.slice(0,10));
}

function showSites(sites){
    const sites_list = document.getElementById('sites');
    sites.forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s.href;
        a.innerText = s.title;
        li.appendChild(a);
        sites_list.appendChild(li)
    })
}