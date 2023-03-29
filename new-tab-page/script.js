//TODO: User settings to manually hide sites (and reset that eventually)
//TODO: User setting to pick different theme 
//TODO: User setting to control params 
//TODO: write tests
//TODO: Improve overall performance with local storage? incremental updates?
//TODO: dedupe so not showing multiple results for same domain?
//TODO: add different animation entrances to liven up
//TODO: better background. also dynamic? 
//TODO: come up with contextually relevant shortcuts. e.g when you browse x 
//TODO: add other widgets like clock, 
//you also browse y and z

//Define how far back in history to pull from for highly visited sites
//And how many to show on the page
const topNHistorySites = 10;
// const historyTimeRange = Date.now() - 24 * 60 * 60 * 1000; // 4 weeks
const historyTimeRange = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
const dedupe_time_range = (10 * 60 * 1000); // 10 mins
//Limit amount of history pulled, if starting to see any performance issues
const maxHistoryResults = 0; //0 for no limit
//How much to increase weight for typed and bookmarked
const transitionScoreMultiplier = 3;
//Which transition types get the multipler
const transitionScoreTypes = ["typed", "auto_bookmark"]
//Consider morning starting at this hour
const morningHourStart = 0;
//Consider morning ending before this hour (exclusive)
const morningHourEnd = 12;
//Consider evening starting at this hour
const eveningHourStart = 12;
//Sigmoid constant
//3 goes to 5% at 22 days. 2 goes to 5% at 15 days. 1 goes to 5% at 7 days
const SIGMOID = 3; 

//First get the standard top sites and add them to the page
chrome.topSites.get().then(topSites => {
  addSitesToSection(topSites.sort(sortAscByKey("url")), 'topSites');
  topSitesCleanedUrls = topSites.map(t => cleanUrl(t.url));
  console.log(topSitesCleanedUrls);
}, reason => console.error(reason))
  .then(calcAdvancedTopSites());

//More sophisticated calculation of top sites enabling a morning and evening suggestion 
async function calcAdvancedTopSites() {
  try {

    //Get history
    let historicSites = await chrome.history.search(
      { text: "", startTime: historyTimeRange, maxResults: maxHistoryResults }); //use 0 to get all history
    console.log('history fetched');

    //remove internal pages, localhost and non URL pages
    historicSites = historicSites.filter(h => {
      return (!h.url.match(/^chrome/) && !h.url.match(/localhost/) && h.url.match(/^http/))
    })

    //Remove those already in top sites
    const historicSitesDeduped = historicSites.filter(h => {
      return (!topSitesCleanedUrls.includes(cleanUrl(h.url)));
    })

    //Enrich history with visits data and clean URL for grouping
    //Map is faster than a for of loop, want to learn why
    const historicSitesAll = await Promise.all(historicSitesDeduped.map(async (h) => {
      const visits = await chrome.history.getVisits({ url: h.url });
      const cleanedUrl = cleanUrl(h.url);
      return { ...h, visits, cleanedUrl };
    }));
    console.log('visits fetched');


    //Group on the cleaned URL 
    const historicSitesAllGrouped = [];
    historicSitesAll.forEach((h, i) => {
      const findIndex = historicSitesAllGrouped.findIndex(hf => {
        return (hf.cleanedUrl === h.cleanedUrl);
      });
      //if already exists in the grouped array, merge it, else push it
      if (findIndex >= 0) {
        historicSitesAllGrouped[findIndex].visits.push(...h.visits);
      } else {
        historicSitesAllGrouped.push(h);
      };
    });


    //Do several things for each URL grouped set of history
    historicSitesAllGrouped.forEach((h, i) => {

      //First round the visit time 
      const visits = historicSitesAllGrouped[i].visits;
      visits.map(v => {
        v.visitTimeReadable = new Date(v.visitTime);
        v.visitTime = Math.round(v.visitTime / dedupe_time_range) * dedupe_time_range;
        return { ...v };
      });
      h.visits = visits;

      //Dedupe the vists by that rounded time
      dedupedVisits = visits.filter((v, i) => {
        return (i === visits.findIndex(vf => vf.visitTime == v.visitTime));
      });
      h.dedupedVisits = dedupedVisits;

      //Calculate only morning visits
      const morningVisits = dedupedVisits.filter(v => {
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour >= morningHourStart && hour < morningHourEnd)
      });
      h.morningVisits = morningVisits
      h.morningVisitCount = morningVisits.reduce((tot_val, m) => {
        return tot_val + (transitionScoreTypes.includes(m.transition) ? transitionScoreMultiplier : 1) * sigmoidTimeScore(m.visitTime);
      }, 0);

      //Calculate only evening visits
      const eveningVisits = dedupedVisits.filter(v => {
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour >= eveningHourStart)
      });
      h.eveningVisits = eveningVisits
      h.eveningVisitCount = eveningVisits.reduce((tot_val, m) => {
        return tot_val + (transitionScoreTypes.includes(m.transition) ? transitionScoreMultiplier : 1) * sigmoidTimeScore(m.visitTime);
      }, 0);

       //Calculate similar hour of day visits
       const currentTimeVisits = dedupedVisits.filter(v => {
        const hourNow = (new Date(Date.now())).getHours();
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour >= hourNow -2 && hour <= hourNow +2)
      });
      h.currentTimeVisits = currentTimeVisits;
      h.currentTimeVisitCount = currentTimeVisits.reduce((tot_val, m) => {
        return tot_val + (transitionScoreTypes.includes(m.transition) ? transitionScoreMultiplier : 1) * sigmoidTimeScore(m.visitTime);
      }, 0);

    })
    console.log('scores calculated');

    //Sort for morning score and add to DOM
    historicSitesAllGrouped.sort((a, b) => {
      aScore = a.morningVisitCount - a.eveningVisitCount;
      bScore = b.morningVisitCount - b.eveningVisitCount;
      if (aScore > bScore) return -1;
      if (aScore < bScore) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites).sort(sortAscByKey("cleanedUrl")), 'topMorningSites');
    console.table('morning:', historicSitesAllGrouped.slice(0, 10));

    //Sort for evening score and add to DOM
    historicSitesAllGrouped.sort((a, b) => {
      aScore = a.eveningVisitCount - a.morningVisitCount;
      bScore = b.eveningVisitCount - b.morningVisitCount;
      if (aScore > bScore) return -1;
      if (aScore < bScore) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites).sort(sortAscByKey("cleanedUrl")), 'topEveningSites');
    console.log('evening:', historicSitesAllGrouped.slice(0, 10));

    //Sort for similar to now hour and add to DOM
    historicSitesAllGrouped.sort((a, b) => {
      aScore = a.currentTimeVisitCount;
      bScore = b.currentTimeVisitCount;
      if (aScore > bScore) return -1;
      if (aScore < bScore) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites).sort(sortAscByKey("cleanedUrl")), 'topThisTime');
    console.log('thisTimeOfDay:', historicSitesAllGrouped.slice(0, 10));

    
  } catch (error) {
    console.error(error);
  }
};


//Function to add site shortcuts to the DOM
function addSitesToSection(topSites, sectionId) {
  const div = document.getElementById(sectionId);
  for (site of topSites) {
    const siteShortcut = document.createElement('div');
    siteShortcut.className = 'top-site animate';
    siteShortcut.style = `--y-dist: ${Math.random() * 100 + 200}px`;
    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'top-site-link';
    const title = document.createElement('span');
    title.textContent = cleanTitle(site.title);
    const favicon = document.createElement('img');
    // favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${site.url}`
    favicon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURI(site.url)}&size=64`;
    div.appendChild(link);
    link.appendChild(siteShortcut);
    siteShortcut.appendChild(favicon);
    siteShortcut.appendChild(title);
  }
}

/* HELPER FUNCTIONS */

function cleanUrl(url) {
  //lower case and trim
  //TODO does this break tokens passed in URL? maybe only lower case proper part of URL
  let cleanedUrl = url.toLowerCase().trim();
  //remove trailing '/"
  cleanedUrl = cleanedUrl.replace(/\/$/, "");
  //remove www 
  cleanedUrl = cleanedUrl.replace(/www\./, "");
  return cleanedUrl;
}

function cleanTitle(title) {
  // remove parentheses patterns like (3)
  let cleanedTitle = title.replace(/\([^\)]*\)/, "");
  // Only keep section before dash or semicolon
  cleanedTitle = cleanedTitle.split(/\-|\–|:/)[0];
  // change period to space
  cleanedTitle = cleanedTitle.replace(/(\w)(\.)(\w)/, "$1 $3");
  return cleanedTitle;
}

function pprint(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function sortAscByKey(key) {
  return function (a, b) {
    if (a[key] > b[key]) return 1
    if (a[key] < b[key]) return -1
    return 0;
  };
}

function sigmoidTimeScore(epochTime){
  const timeNow = Date.now();
  const days = (timeNow - epochTime) / 1000 / 60 / 60 /24;
  const sigmoidVal = 1/(1+Math.exp(-(4.5-Math.abs(days/SIGMOID))));
  return sigmoidVal
}