//TODO: Improve overall performance with local storage? incremental updates?
//Define how far back in history to pull from for highly visited sites
//And how many to show on the page
const topNHistorySites = 20;
// const historyTimeRange = Date.now() - 24 * 60 * 60 * 1000; // 4 weeks
const historyTimeRange = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
const dedupe_time_range = (10 * 60 * 1000); // 10 mins

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
      if (v.map(i => i.transition === 'typed' || i.transition === 'auto_bookmark').includes(true)
        // &&
        // remove if found in a topSite already
        // TODO: improve deduplication with some regex cleanup
        // !topSites.some(t => s.url.match(t.url))
      ) historicSitesFiltered.push(s);
    }

    //Add history shortcuts to page
    addSitesToSection(historicSitesFiltered.slice(0, topNHistorySites), 'calcedTopSites');



    //Enrich history with visits data, creating a copy
    const historicSitesAll = await Promise.all(historicSites.slice().map(async (h, i) => {
      //Get visits data
      const visits = await chrome.history.getVisits({ url: h.url });
      
      //Filter to supported types (not used yet)
      // visits.map(v => {
      //   if (v.transition == "auto_bookmark") console.log(v.url, v.visitTime, Math.round(v.visitTime / dedupe_time_range)*dedupe_time_range);
      // })

      //Round visit time for deduping
      visits.map(v => {
        v.visitTimeReadable = new Date(v.visitTime);
        v.visitTime = Math.round(v.visitTime / dedupe_time_range) * dedupe_time_range;
        delete v.referringVisitId;
        return v;
      });


      //Dedupe the vists by time
      dedupedVisits = visits.filter((v, i) => {
        return (i === visits.findIndex(vf => vf.visitTime == v.visitTime));
      });
      h.dedupedVisits = dedupedVisits;

      morningVisits = dedupedVisits.filter(v => {
       const t = new Date(v.visitTime);
       const hour = t.getHours();
       return (hour <= 12)
      });

      h.morningVisits = morningVisits

      eveningVisits = dedupedVisits.filter(v => {
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour > 18)
       });
 
       h.eveningVisits = eveningVisits
 
      //Get number of deduped visits for sorting
      //TODO: change this to a weighted formula: higher val for more recent (in particular last 5 minutes?), test favor typed over linked?
      //TODO: score should be calculated after the same URL merge below
      h.totDedupedVisits = dedupedVisits.length;      
      h.visits = visits;
      // h.score = h.totDedupedVisits * h.typedCount;
      h.score = eveningVisits.length;

      return h;

    }));

    //clean up URLs so we can merge 
    historicSitesAll.map(h => {
      const cleanedUrl = cleanURL(h.url);
      if (cleanedUrl !== h.url){
        h.oldUrl = h.url;
        h.url = cleanedUrl;
        if (h.url == 'https://events12.com/seattle') console.log(h);
      } 
      return h;
    })

    //TODO: merge operation 
    historicSitesAll.map((h,i) => {
      //if URL exists earlier
      if (i === historicSitesAll.find(hf => hf.url === h.url)){
        console.log(h.url);
      };

    })

    //TODO: cleanup title (remove random numbers, keep only one side of : and -)

    //Sort by score
    historicSitesAll.sort((a, b) => {
      if (a.score > b.score) return -1;
      if (a.score < b.score) return 1;
      return 0;
    })

    //Trim to the top results and order same domains together
    //TODO: different UI for same domain clusters?

    //Add to new section
    addSitesToSection(historicSitesAll.slice(0, topNHistorySites), 'betterCalcedTopSites');
    historicSitesAll.slice(0, topNHistorySites).map(h => console.log(h.oldUrl, h.morningVisits.length, h.eveningVisits.length));
    historicSitesFiltered.slice(0, topNHistorySites).map(h => console.log(h.url, h.typedCount));

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
    siteShortcut.style = `--y-dist: ${Math.random() * 500 + 300}px`;
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

function cleanURL(url) {
  //lower case and trim
  //TODO does this break tokens passed in URL? maybe only lower case proper part of URL
  let cleanURL = url.toLowerCase().trim();
  //remove trailing '/"
  cleanURL = cleanURL.replace(/\/$/, "");
  //remove www
  cleanURL = cleanURL.replace(/www\./, "");
  return cleanURL;
}


function pprint(obj){
  console.log(JSON.stringify(obj, null, 2));
}