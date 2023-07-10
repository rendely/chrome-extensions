const profileList = [];
const results = []
const waitTime = 5000;
let connection;

slowlyLoadProfiles();

chrome.runtime.onMessage.addListener(
  function (request, sender) {
    if (request.id === 'data') {
      console.log(request);
      console.log(connection);
      results.push({ ...request, connection: connection });
    }
    if (request.id === 'profile') {
      profileList.push(request.url);
      console.log('Added profile:', request.url);
      connection = request.connection;
    }
    if (request.id === 'close') {
      chrome.tabs.remove(sender.tab.id);
    }
    if (request.id === 'log') {
      console.log('Logging:', request.url);
    }
  }
);


function slowlyLoadProfiles() {
  if (profileList.length > 0) {
    const url = profileList.shift();
    chrome.tabs.create({ active: false, url: url });
  }
  setTimeout(slowlyLoadProfiles, waitTime);
}

function searchResults(keyword, results) {
  const matches = results.filter(r => (r.company1 + r.company2).toLowerCase().replace(' ', '').match(keyword.toLowerCase().replace(' ', '')));
  return matches;
}

function searchCompanies(list, results) {
  const finalMatches = [];
  list.forEach(r => {
    const matches = searchResults(r, results);
    if (matches.length > 0) {
      updatedMatches = matches.map(m => { return { ...m, keyword: r }})
      finalMatches.push(...updatedMatches);
    }
  })
  console.table(finalMatches);
}

// cleanResults = results.filter((r, i) => i === results.findIndex(r2 => r2.fullName === r.fullName))

