// Extract all the bookmarks
const bookmarks = [];
const folders = [];
getAllBookmarks(bookmarkExtraction);
console.log(bookmarks);
console.log(folders);

// TODO: Add event listener to refetch bookmarks and folders if anything changes


// Function to find all the bookmarks in the main root and use bookmarkExtraction as the callback
function getAllBookmarks(callback) {
  chrome.bookmarks.getTree(b => {    
    callback(b[0], "Bookmarks");
  });
}

function bookmarkExtraction(b, folderName) {
  if (!b.children && !!b.title) {
    bookmarks.push({...b, 
      "folderTree":folderName,});
  } else if (!!b.children) {
    if (b.id !== "0") folders.push({...b}); // don't push root folder
    const newFolderName = !!b.title ? `${folderName} > ${b.title}` : folderName;
    b.children.forEach(b => bookmarkExtraction(b, newFolderName));
  }
}

// Archive and flatten to remove folders
let archiveFlattenButton = document.getElementById('action-archive-flatten');
archiveFlattenButton.addEventListener("click", archiveFlatten);

async function archiveFlatten(event){
  const archiveFolderId = await getArchiveFolderId();
  bookmarks.forEach(async function(b){
    await chrome.bookmarks.move(b.id, {"parentId": archiveFolderId});
  });
  //TODO should I delete and re-create? that messes up undo a lot. Maybe hide in a temp folder?
  folders.forEach(async function(f){
    if (f.parentId !== "0" && f.id !== archiveFolderId) await chrome.bookmarks.move(f.id, {"parentId": archiveFolderId});
  });
  console.log('Archive flatten');
  const el = event.target
  el.innerText = "Undo Archive";
  el.removeEventListener("click", archiveFlatten)
  el.addEventListener("click", undoArchiveFlatten);
  el.classList.add("action-button-undo");
}

function undoArchiveFlatten(event){
  bookmarks.forEach(async function(b){
    await chrome.bookmarks.move(b.id, {"parentId": b.parentId});
  });
  folders.forEach(async function(f){
    if (f.parentId !== "0") await chrome.bookmarks.move(f.id, {"parentId": f.parentId, "index": f.index});
  });
  console.log('Undo archive flatten');
  const el = event.target
  el.innerText = "Archive all (flatten)";
  el.removeEventListener("click", undoArchiveFlatten)
  el.addEventListener("click",  archiveFlatten);
  el.classList.remove("action-button-undo");
}

// Archive and keep folders


// Ensure archive folder exists and get id
async function getArchiveFolderId(){
  const r = await chrome.bookmarks.search("ARCHIVE");
  if (r.length == 0 || r[0].parentId != "2") {
    const archiveFolder = await chrome.bookmarks.create({"title": "ARCHIVE"});
    return archiveFolder.id;
  }
  else{
    return r[0].id;
  }
}
