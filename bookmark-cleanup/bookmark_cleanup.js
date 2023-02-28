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
// TODO: also hide all folders in a DELETED FOLDERS folder? Makes undo difficult if we delete
let archiveFlattenButton = document.getElementById('action-archive-flatten');
archiveFlattenButton.addEventListener("click", archiveFlatten);

async function archiveFlatten(event){
  const archiveFolderId = await getArchiveFolderId();
  bookmarks.forEach(async function(b){
    await chrome.bookmarks.move(b.id, {"parentId": archiveFolderId});
  });
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

let archiveKeepFoldersButton = document.getElementById('action-archive-keep-folders');
archiveKeepFoldersButton.addEventListener("click", archiveKeepFolders);

async function archiveKeepFolders(event){
  const archiveFolderId = await getArchiveFolderId();
  bookmarks.forEach(async function(b){
    if (b.parentId == "1") await chrome.bookmarks.move(b.id, {"parentId": archiveFolderId});
  });
  folders.forEach(async function(f){
    if (f.parentId !== "0" && f.id !== archiveFolderId) await chrome.bookmarks.move(f.id, {"parentId": archiveFolderId});
  });
  console.log('Archive keep folders');
  const el = event.target
  el.innerText = "Undo Archive";
  el.removeEventListener("click", archiveKeepFolders)
  el.addEventListener("click", undoArchiveKeepFolders);
  el.classList.add("action-button-undo");
}

function undoArchiveKeepFolders(event){
  bookmarks.forEach(async function(b){
    await chrome.bookmarks.move(b.id, {"parentId": b.parentId});
  });
  folders.forEach(async function(f){
    if (f.parentId !== "0") await chrome.bookmarks.move(f.id, {"parentId": f.parentId, "index": f.index});
  });
  console.log('Undo archive keep folders');
  const el = event.target
  el.innerText = "Archive all (flatten)";
  el.removeEventListener("click", undoArchiveKeepFolders)
  el.addEventListener("click",  archiveKeepFolders);
  el.classList.remove("action-button-undo");
}

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

// Sort the archive folder contents
// TODO: sort within each folder as well

let sortArchiveButton = document.getElementById('action-sort-archive');
sortArchiveButton.addEventListener("click", sortArchive);

async function sortArchive(event){
  const archiveFolderId = await getArchiveFolderId();
  const archiveFolderContentsRoot = await chrome.bookmarks.getSubTree(archiveFolderId);
  //global so we can undo it if needed
  archiveFolderContent = archiveFolderContentsRoot[0].children;  
  const sortedFolders = archiveFolderContent.sort(function(a,b){
    if (!!a.children && !b.children) return -1;
    if (!a.children && !!b.children) return 1;
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });

  for (let i=0; i< sortedFolders.length; i++){
    await chrome.bookmarks.move(sortedFolders[i].id, {"index": i});
  }

  const el = event.target;
  el.innerText = "Undo sort";
  el.removeEventListener("click", sortArchive)
  el.addEventListener("click",  undoSortArchive);
  el.classList.add("action-button-undo");
  chrome.tabs.create({
    url: 'chrome://bookmarks/?id='+archiveFolderId,
    selected: true,
  });
}

//TODO: doesn't exactly work, some weird behavior
async function undoSortArchive(event){
  archiveFolderContent.forEach(async function(b){
    await chrome.bookmarks.move(b.id, { "index": b.index});
  });
  console.log('Undo sort');
  const el = event.target
  el.innerText = "Sort archive folder";
  el.removeEventListener("click", undoSortArchive)
  el.addEventListener("click",  sortArchive);
  el.classList.remove("action-button-undo");

}