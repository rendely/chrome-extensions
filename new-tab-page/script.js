//Define how far back in history to pull from for highly visited sites
//And how many to show on the page
topNHistorySites = 10;
historyTimeRange = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks

(async () => {
  try {
    //Get the top sites and add them to the page
    const topSites = await chrome.topSites.get();
    addSitesToSection(topSites, 'topSites');

    //Then get sites from history, sort by most visited and add the top 20 to the page
    //TODO: can't rely on typedCount field, also should pull in bookmark clicks auto_bookmark
    //TODO: will probably need linked type as well but with some filtering since sites
    //like reddit create a lot of junk duplicates
    const historicSites = await chrome.history.search(
      { text: "", startTime: historyTimeRange, maxResults: 10000 });

    //Sort by most visisted
    const historicSitesSortedByVisitCount = historicSites.sort((a, b) => {
      if (a.typedCount > b.typedCount) return -1;
      if (a.typedCount < b.typedCount) return 1;
      return 0;
    });

    //Filter to sites with a typed visit
    const historicSitesFiltered = [];
    for (s of historicSitesSortedByVisitCount) {
      const v = await chrome.history.getVisits({ url: s.url });
      //must be typed or bookmark transition type
      if (v.map(i => i.transition === 'typed' || i.transition==='auto_bookmark').includes(true) 
      // &&
      // remove if found in a topSite already
      // TODO: improve deduplication with some regex cleanup
      // !topSites.some(t => s.url.match(t.url))
      ) historicSitesFiltered.push(s);
    }

    //TODO: sort by frecency score
    // const historicSitesSortedByDomain = historicSitesFiltered.sort((a,b) => {
    //   if (a.title > b.title) return -1;
    //   if (a.title < b.title) return 1;
    //   return 0;
    // });

    //Add history shortcuts to page
    addSitesToSection(historicSitesFiltered.splice(0, topNHistorySites), 'calcedTopSites');


    //TODO: come up with contextually relevant shortcuts. e.g when you browse x 
    //you also browse y and z
  } catch (error) {
    console.error(error);
  }
})();


//Add site shortcuts to the page
function addSitesToSection(topSites, sectionId) {
  const div = document.getElementById(sectionId);
  for (site of topSites) {
    const siteShortcut = document.createElement('div');
    siteShortcut.className = 'top-site animate';
    siteShortcut.style = `--y-dist: ${Math.random()*500+300}px`;
    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'top-site-link';
    const title = document.createElement('span');
    // if (site.visitCount) title.textContent += `[${site.visitCount}] `
    title.textContent += site.title;
    const favicon = document.createElement('img');
    if (site.url.match('http')) favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${site.url}`
    div.appendChild(link);
    link.appendChild(siteShortcut);
    siteShortcut.appendChild(favicon);
    siteShortcut.appendChild(title);
  }
}