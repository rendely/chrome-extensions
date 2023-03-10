//Define how far back in history to pull from for highly visited sites
//And how many to show on the page
topNHistorySites = 20;
historyTimeRange = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks

//Get the top sites and add them to the page
chrome.topSites.get()
  .then(topSites => addSitesToSection(topSites,'topSites'))

  //Then get sites from history, sort by most visited and add the top 20
  //to the page
  .then(chrome.history.search({text: "", startTime: historyTimeRange})
    .then(historicSites =>  {
      historicSitesSorted = historicSites.sort((a,b) => {
        if (a.visitCount > b.visitCount) return -1;
        if (a.visitCount < b.visitCount) return 1;
        return 0;
      });
      addSitesToSection(historicSitesSorted.splice(0,topNHistorySites),'topSites');
    })
  );

//Add site shortcuts to the page
function addSitesToSection(topSites,sectionId){
  const div = document.getElementById(sectionId);
  for (site of topSites){
    const siteShortcut = document.createElement('div');
    siteShortcut.className = 'top-site';
    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'top-site-link';
    const title = document.createElement('span');
    if (site.visitCount) title.textContent += `[${site.visitCount}] `
    title.textContent += site.title;
    // siteShortcut.textContent = site.title + ' - ' + site.url;
    const favicon = document.createElement('img');
    if (site.url.match('http')) favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${site.url}`
    div.appendChild(link);
    link.appendChild(siteShortcut);
    siteShortcut.appendChild(favicon);
    siteShortcut.appendChild(title);
  }
}