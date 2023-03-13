//TODO: write tests
//TODO: Improve overall performance with local storage? incremental updates?
//TODO: better scoring algo
//TODO: change time based to be dynamic to current time
//TODO: add different animation entrances to liven up
//TODO: better background. also dynamic? 
//TODO: add other widgets: contextual shortcuts, clock, 
//Define how far back in history to pull from for highly visited sites
//And how many to show on the page
const topNHistorySites = 10;
// const historyTimeRange = Date.now() - 24 * 60 * 60 * 1000; // 4 weeks
const historyTimeRange = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
const dedupe_time_range = (10 * 60 * 1000); // 10 mins
//How much to increase weight for typed and bookmarked
const transitionScoreMultiplier = 3;
//Which transition types get the multipler
const transitionScoreTypes = ["typed","auto_bookmark"]
//Consider morning starting at this hour
const morningHourStart = 0;
//Consider morning ending before this hour (exclusive)
const morningHourEnd = 12;
//Consider evening starting at this hour
const eveningHourStart = 12;

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

    //Then get sites from history, sort by most visited and add the top 20 to the page
    //TODO: can't rely on typedCount field, also should pull in bookmark clicks auto_bookmark
    //TODO: will probably need linked type as well but with some filtering since sites
    //like reddit create a lot of junk duplicates
    let historicSites = await chrome.history.search(
      { text: "", startTime: historyTimeRange, maxResults: 0 }); //use 0 to get all history


    //remove internal pages and non URL pages
    historicSites = historicSites.filter(h => {
      return (!h.url.match(/^chrome/) && h.url.match(/^http/))
    })

    //Sort by most visisted
    // typedCount value is actually incorrect a lot of the time so not relying on it
    // const historicSitesSortedByVisitCount = historicSites.sort((a, b) => {
    //   if (a.typedCount > b.typedCount) return -1;
    //   if (a.typedCount < b.typedCount) return 1;
    //   return 0;
    // });

    //Filter to sites with a typed visit
    // const historicSitesFiltered = [];
    // for (s of historicSitesSortedByVisitCount) {
    //   const v = await chrome.history.getVisits({ url: s.url });
    //   //must be typed or bookmark transition type
    //   if (v.map(i => i.transition === 'typed' || i.transition === 'auto_bookmark').includes(true)
    //     // &&
    //     // remove if found in a topSite already
    //     // TODO: improve deduplication with some regex cleanup
    //     // !topSites.some(t => s.url.match(t.url))
    //   ) historicSitesFiltered.push(s);
    // }

    //Add history shortcuts to page
    // addSitesToSection(historicSitesFiltered.slice(0, topNHistorySites), 'calcedTopSites');

    //Remove those already in top sites
    const historicSitesDeduped = historicSites.filter(h => {
      return (!topSitesCleanedUrls.includes(cleanUrl(h.url)));
    })

    //Enrich history with visits data and clean URL for grouping
    const historicSitesAll = await Promise.all(historicSitesDeduped.map(async (h) => {
      const visits = await chrome.history.getVisits({ url: h.url });
      const cleanedUrl = cleanUrl(h.url);
      return { ...h, visits, cleanedUrl };
    }));



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


    //Round visit time for deduping
    historicSitesAllGrouped.forEach((h, i) => {
      const visits = historicSitesAllGrouped[i].visits;
      visits.map(v => {
        v.visitTimeReadable = new Date(v.visitTime);
        v.visitTime = Math.round(v.visitTime / dedupe_time_range) * dedupe_time_range;
        return { ...v };
      });
      h.visits = visits;

      //Dedupe the vists by time
      dedupedVisits = visits.filter((v, i) => {
        return (i === visits.findIndex(vf => vf.visitTime == v.visitTime));
      });
      h.dedupedVisits = dedupedVisits;

      //Calculate only morning visits
      morningVisits = dedupedVisits.filter(v => {
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour >= morningHourStart && hour < morningHourEnd)
      });

      h.morningVisits = morningVisits
      // h.morningVisitCount = morningVisits.length;
      h.morningVisitCount = morningVisits.reduce((tot_val, m)=> {
        //TODO generalize this scoring function and make it include date formula, use for evening as well
        //TODO sigmoid function for hours close to current hour
        //TODO other sigmoid for nearer vs further away dates 
        return tot_val + (transitionScoreTypes.includes(m.transition) ? transitionScoreMultiplier :1);
      } ,0);

      //Calculate only evening visits
      eveningVisits = dedupedVisits.filter(v => {
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour >= eveningHourStart)
      });

      h.eveningVisits = eveningVisits
      // h.eveningVisitCount = eveningVisits.length;
      // Improved score by weighting typed and bookmark much higher
      h.eveningVisitCount = eveningVisits.reduce((tot_val, m)=> {
        return tot_val + (transitionScoreTypes.includes(m.transition) ? transitionScoreMultiplier :1);
      } ,0);

      h.score = h.dedupedVisits;

    })

    //Sort by score
    historicSitesAllGrouped.sort((a, b) => {
      if (a.score > b.score) return -1;
      if (a.score < b.score) return 1;
      return 0;
    })


    //TODO: different UI for same domain clusters?
    //Trim to the top results and order same domains together

    //Add to new section
    // addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites), 'betterCalcedTopSites');

    //Add morning sites
    historicSitesAllGrouped.sort((a, b) => {
      aScore = a.morningVisitCount - a.eveningVisitCount;
      bScore = b.morningVisitCount - b.eveningVisitCount;
      if (aScore > bScore) return -1;
      if (aScore < bScore) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites).sort(sortAscByKey("cleanedUrl")), 'topMorningSites');
    console.log('morning:',historicSitesAllGrouped.slice(0, 10));

    //Add evening sites
    historicSitesAllGrouped.sort((a, b) => {
      aScore = a.eveningVisitCount - a.morningVisitCount;
      bScore = b.eveningVisitCount - b.morningVisitCount;
      if (aScore > bScore) return -1;
      if (aScore < bScore) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites).sort(sortAscByKey("cleanedUrl")), 'topEveningSites');
    console.log('evening:',historicSitesAllGrouped.slice(0, 10));

    // //TODO: come up with contextually relevant shortcuts. e.g when you browse x 
    // //you also browse y and z
  } catch (error) {
    console.error(error);
  }
};


//Add site shortcuts to the page
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
    // if (site.visitCount) title.textContent += `[${site.visitCount}] `
    title.textContent += cleanTitle(site.title);
    const favicon = document.createElement('img');
    //TODO Fix broken for some sites: gmail.com
    if (site.url.match('http')) favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${site.url}`
    div.appendChild(link);
    link.appendChild(siteShortcut);
    siteShortcut.appendChild(favicon);
    siteShortcut.appendChild(title);
  }
}

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
  cleanedTitle = cleanedTitle.split(/\-|–|:/)[0];
  return cleanedTitle;
}



function pprint(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function sortAscByKey(key){
return function (a,b){
  if (a[key] > b[key]) return 1
  if (a[key] < b[key]) return -1
  return 0;
};
}