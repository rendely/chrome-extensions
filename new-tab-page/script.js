//Get the top sites and add them to the page
chrome.topSites.get(showTopSites);


//Add them to the page
function showTopSites(topSites){
  console.log(topSites);
  const div = document.getElementById('topSites');
  for (site of topSites){
    console.log(site);
    console.log(site.url);
    const siteShortcut = document.createElement('div');
    const link = document.createElement('a');
    link.href = site.url;
    link.textContent = site.title;
    siteShortcut.className = 'top-site';
    // siteShortcut.textContent = site.title + ' - ' + site.url;
    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${site.url}`
    siteShortcut.appendChild(favicon);
    siteShortcut.appendChild(link);
    div.appendChild(siteShortcut);
  }
}