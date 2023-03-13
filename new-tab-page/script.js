//TODO: Improve overall performance with local storage? incremental updates?
//Define how far back in history to pull from for highly visited sites
//And how many to show on the page
const topNHistorySites = 10;
// const historyTimeRange = Date.now() - 24 * 60 * 60 * 1000; // 4 weeks
const historyTimeRange = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
const dedupe_time_range = (10 * 60 * 1000); // 10 mins


//First get the standard top sites and add them to the page
chrome.topSites.get().then(topSites => {
  addSitesToSection(topSites, 'topSites');
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


    //Enrich history with visits data and clean URL for grouping
    const historicSitesAll = await Promise.all(historicSites.map(async (h) => {
      const visits = await chrome.history.getVisits({ url: h.url });
      const cleanedUrl = cleanUrl(h.url);
      return { ...h, visits, cleanedUrl };
    }));

    //Remove those already in top sites
    const historicSitesDeduped = historicSitesAll.filter(h =>{
      return (!topSitesCleanedUrls.includes(h.cleanedUrl));
    })

        
    //Group on the cleaned URL 
    const historicSitesAllGrouped = [];
    historicSitesDeduped.forEach((h, i) => {
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
        return (hour < 12)
      });

      h.morningVisits = morningVisits
      h.morningVisitCount = morningVisits.length;

      //Calculate only evening visits
      eveningVisits = dedupedVisits.filter(v => {
        const t = new Date(v.visitTime);
        const hour = t.getHours();
        return (hour >= 12)
      });

      h.eveningVisits = eveningVisits
      h.eveningVisitCount = eveningVisits.length;

      //Calculate a score for sorting
      //TODO: change this to a weighted formula: higher val for more recent (in particular last 5 minutes?), test favor typed over linked?
      //TODO: score should be calculated after the same URL merge below
      h.score = h.dedupedVisits;

    })

    //Sort by score
    historicSitesAllGrouped.sort((a, b) => {
      if (a.score > b.score) return -1;
      if (a.score < b.score) return 1;
      return 0;
    })

    console.log(historicSitesAllGrouped.slice(0, 10));

    //TODO: different UI for same domain clusters?
    //Trim to the top results and order same domains together

    //Add to new section
    // addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites), 'betterCalcedTopSites');

    //Add morning sites
    historicSitesAllGrouped.sort((a, b) => {
      if (a.morningVisitCount > b.morningVisitCount) return -1;
      if (a.morningVisitCount < b.morningVisitCount) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites), 'topMorningSites');

    //Add evening sites
    historicSitesAllGrouped.sort((a, b) => {
      if (a.eveningVisitCount > b.eveningVisitCount) return -1;
      if (a.eveningVisitCount < b.eveningVisitCount) return 1;
      return 0;
    })
    addSitesToSection(historicSitesAllGrouped.slice(0, topNHistorySites), 'topEveningSites');


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
    siteShortcut.style = `--y-dist: ${Math.random() * 500 + 300}px`;
    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'top-site-link';
    const title = document.createElement('span');
    // if (site.visitCount) title.textContent += `[${site.visitCount}] `
    title.textContent += cleanTitle(site.title);
    const favicon = document.createElement('img');
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