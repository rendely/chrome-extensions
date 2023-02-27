const bookmarks = [];
getAllBookmarks(bookmarkExtraction);
console.log(bookmarks);

function getAllBookmarks(callback) {
  chrome.bookmarks.getTree(b => {    
    callback(b[0], "Bookmarks");
  });
}

//Extract the bookmarks
function bookmarkExtraction(b, folder_name) {
  if (!b.children && !!b.title) {
    bookmarks.push({...b, 
      "folder_tree":folder_name,});
  } else if (!!b.children) {
    const new_folder_name = !!b.title ? `${folder_name} > ${b.title}` : folder_name;
    b.children.forEach(b => bookmarkExtraction(b, new_folder_name));
  }
}