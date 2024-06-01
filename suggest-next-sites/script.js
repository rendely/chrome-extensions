var currentTabId = 'not set';
var currentUrl = 'not set';

chrome.tabs.query({ active: true, currentWindow: true },
    tabs => updateCurrent(tabs[0])
);

function updateCurrent(tab) {
    currentTabId = tab.id;
    currentUrl = tab.url;
    const current = document.getElementById('current');
    current.href = tab.url;
    current.innerText = tab.title;
    getSuggested();
}

chrome.tabs.onActivated.addListener(info => refreshSuggest(info.tabId))

chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (tabId === currentTabId) refreshSuggest(tabId)
});


async function refreshSuggest(tabId) {
    currentTabId = tabId;
    const tab = await chrome.tabs.get(tabId);
    currentUrl = tab.url;
    updateCurrent(tab);
}


async function getSuggested() {
    console.log('getting suggested for:', currentUrl);
    const allHistory = await chrome.history.search(
        { text: "", maxResults: 10000, startTime: 0 });

    const allVisitsPromises = allHistory.map(async h => {
        const visits = await chrome.history.getVisits({ url: h.url });
        return visits.map(v => ({ url: h.url, time: v.visitTime }));
    });

    const allVisitsArrays = await Promise.all(allVisitsPromises);
    const allVisits = allVisitsArrays.flat();


    const sortedVisits = allVisits.sort((a, b) => a.time - b.time)
    
    const nextCount = {}
    for (let i = 0; i < sortedVisits.length - 1; i++) {
        if (sortedVisits[i].url === currentUrl) {
            const nextUrl = sortedVisits[i + 1].url
            if (nextCount[nextUrl]) {
                nextCount[nextUrl]++
            } else {
                nextCount[nextUrl] = 1
            }
        }
    }
    const sortedNext = Object.entries(nextCount).sort((a,b) => b[1] - a[1]);
    const results = sortedNext.map(s => s[0]);
    showSites(results.slice(0, 10));
}

function showSites(sites) {
    const sitesList = document.getElementById('sites');
    sitesList.innerHTML = '';
    sites.forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s;
        a.innerText = s;
        li.appendChild(a);
        sitesList.appendChild(li)
    })
}