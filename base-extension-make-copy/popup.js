//Append a div to the body of the popup
function appendDiv(text, divId) {
  var div = document.createElement('div');
  div.className = 'result';
  div.innerText = text;
  document.getElementById(divId).appendChild(div);
}

//Get the current tab URL
function getCurrentTabUrl(callback) {
  //let queryOptions = { active: true, lastFocusedWindow: true};
  let queryOptions = {}
  chrome.tabs.query(queryOptions, tabs => {
    tabs.forEach(tab =>
      callback(tab.url, 'tab-list'));
  });
}

//Get all the bookmarks
function getAllBookmarks(callback) {
  chrome.bookmarks.getTree(b => {
    callback(b[0], "Bookmarks");
  });
}

//Extract the bookmarks
function bookmarkExtraction(b, folder_name) {
  if (!b.children && !!b.title) {
    appendDiv(`${folder_name} > ${b.title}`, 'bookmark-list');
  } else if (!!b.children) {
    new_folder_name = !!b.title ? `${folder_name} > ${b.title}` : folder_name;
    b.children.forEach(b => bookmarkExtraction(b, new_folder_name));
  }
}

getAllBookmarks(bookmarkExtraction);
getCurrentTabUrl(appendDiv);
