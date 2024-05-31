currentTabId = undefined;
currentUrl = undefined;

chrome.tabs.query({active: true, currentWindow: true},
    tabs => updateCurrent(tabs[0])
);

chrome.tabs.onActivated.addListener(info => refreshSuggest(info.tabId))

chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (tabId === currentTabId) refreshSuggest(tabId) });

getSuggested();

async function refreshSuggest(tabId){
    currentTabId = tabId;
    const tab = await chrome.tabs.get(tabId);
    currentUrl = tab.url;
    updateCurrent(tab);
}

function updateCurrent(tab){
    currentTabId = tab.id;
    currentUrl = tab.url;
    const current = document.getElementById('current');
    current.href = tab.url;
    current.innerText = tab.title;
}

async function getSuggested(){
    const allHistory = await chrome.history.search(
        {text: "", maxResults: 10000, startTime: 0});

    const allVisits = []
    
    allHistory.forEach(async h => {
        const visits = await chrome.history.getVisits({url: h.url});
        const url_visits = visits.map(v => ({url: h.url, time: v.visitTime}))
        allVisits.push(...url_visits)
    });

    const sortedVisits = allVisits.sort((a,b) => b.time - a.time)
    
    const nextCount = {}
    for (let i = 0; i < sortedVisits.length -1; i++){
        if (sortedVisits[i].url === currentUrl){
            const nextUrl = allHistory[i+1].url 
            console.log(nextUrl);
            if (nextCount[nextUrl]){
                nextCount[nextUrl]++
            }else{
                nextCount[nextUrl] = 1
            }
        }
    }
    const results = Object.keys(nextCount);
    showSites(results.slice(0,10));
}

function showSites(sites){
    console.log(sites);
    const sitesList = document.getElementById('sites');
    sites.forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s;
        a.innerText = s;
        li.appendChild(a);
        sitesList.appendChild(li)
    })
}