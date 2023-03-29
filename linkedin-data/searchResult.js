console.log('search result script loaded');
tryExtract();

function tryExtract() {
  window.setTimeout(extractData, 3000);
}

function extractData() {
  console.log('extracting...');
  try {
    const names = document.querySelectorAll('span.entity-result__title-text > a');
    const connection = document.querySelectorAll('li.search-reusables__primary-filter')[2].innerText;
    for (n of Array.from(names)) {
      chrome.runtime.sendMessage({ id: 'profile', connection: connection, url: n.href });
    }
  } catch (e) {
    console.log(e);
    console.log('not ready yet');
    tryExtract()
  }
}


setTimeout(loadNextPage, 10000);

function loadNextPage() {
  const url = window.location.href;
  const currentPageMatches = url.match(/page=(\d+)/);
  let page;
  let newUrl = '';
  if (currentPageMatches !== null && currentPageMatches.length >= 2) page = Number(currentPageMatches[1]);
  //if the first page, add &page=2 to URL
  if (!currentPageMatches) {
    newUrl = window.location.href + '&page=2';
    window.open(newUrl, { target: "_self" });
  } else if (!document.querySelector('section.artdeco-empty-state')) {
    //if not first page
    //if a next page exists, increment page
    newUrl = url.replace(/&page\=[0-9]+/g, '') + `&page=${page + 1}`;
    window.open(newUrl, { target: "_self" });
  } else {
    console.log('done');
  }
  chrome.runtime.sendMessage({id: "log", url: newUrl});
}