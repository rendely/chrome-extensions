// Extract all the bookmarks
const bookmarks = [];
const folders = [];
getAllBookmarks(bookmarkExtraction);

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

const stop_words = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
"you're", "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 
'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 
'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom',
'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the',
'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for',
'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 
'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 
'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
'will', 'just', 'don', "don't", 'should', "should've", 'now', 'd', 'll', 'm', 'o', 
're', 've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't", 
'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn',
"isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', 
"shan't", 'shouldn', "shouldn't", 'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 
'wouldn', "wouldn't","www","com","org","io"];


let organizeButton = document.getElementById('action-organize');
organizeButton.addEventListener("click", clusterBookmarks.bind(null, 26));

function showSimilarBookmarks(pair, divId){
  targetDiv = document.getElementById(divId);
  containerDiv = document.createElement('div');
  el1 = document.createElement('div');
  el1.textContent = pair.title1;
  el2 = document.createElement('div');
  el2.textContent = pair.title2;
  el3 = document.createElement('div');
  el3.textContent = Math.round(10000 * pair.score) / 10000; 
  el1.className = 'matching-title';
  el2.className = 'matching-title';
  el3.className = 'matching-score';
  containerDiv.className = 'matching-container'
  containerDiv.appendChild(el1);
  containerDiv.appendChild(el2);
  containerDiv.appendChild(el3);
  targetDiv.appendChild(containerDiv);
}

async function tryGetBodyText(url){
  // TODO: handle failures, e.g. fetching a bookmarklet starting with javascript
  if (!url.match('^http.*')){
    return [];
  }
  const result = await chrome.storage.local.get([url])
  if (result[url] !== undefined){
    return result[url];
  }
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
    }
    });
  const htmlString = await response.text();
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlString, 'text/html');
  const bodyTextElements = htmlDoc.body.querySelectorAll('h1, h2, h3, p');
  let bodyText = '';
  bodyTextElements.forEach(el => {bodyText += el.textContent;});
  const bodyTextArray = bodyText.toLowerCase().split(new RegExp("[ |\.|-|-|!|?|\(|\)|\||\n]+"));
  const bodyTextArrayFiltered = bodyTextArray.filter(item => item.match('^[a-z|A-Z]{5,10}$'));
  await chrome.storage.local.set({ [url]: bodyTextArrayFiltered });
  return bodyTextArrayFiltered;  
}

// tryGetBodyText('https://news.ycombinator.com/item?id=34950465');

async function clusterBookmarks(bIndex = 53){
  console.log('clustering', bIndex)
  const wordVectors = {};
    for (const b of bookmarks){
    wordVectors[b.id] = await getWordVector(b);
  };
  
  const pairCosineScores = [];
  for (const [key1, value1] of Object.entries(wordVectors)) {
    for (const [key2, value2] of Object.entries(wordVectors)) {
      const cosineSimilarity = calculateCosineSimilarity(value1, value2);
      if (key2 <= key1 && key1 != key2 && cosineSimilarity > 0.0001) pairCosineScores.push({"id1": value1.id, "id2": value2.id,"title1": value1.title,  "title2": value2.title, "score": cosineSimilarity });
      // if (key1 == bIndex && key1 != key2) pairCosineScores.push({"id1": value1.id, "id2": value2.id,"title1": value1.title,  "title2": value2.title, "score": cosineSimilarity });

    }
  }
  sortedPairCosineScores = pairCosineScores.sort(function(a,b){
    if (a.score < b.score) return 1;
    if (a.score > b.score) return -1;
    return 0;
  });
  // console.log(sortedPairCosineScores);
  sortedPairCosineScores.forEach(e => {
    showSimilarBookmarks(e,'matching-bookmarks');
  })
}

function calculateCosineSimilarity(wv1, wv2){
  let sumProd = 0;
  for (const [key, value] of Object.entries(wv1.wordList)) {
    sumProd += value * (wv2.wordList[key] || 0); 
  }
  const cosineSimilarity = sumProd/(wv1.sqrtSumSquares * wv2.sqrtSumSquares);
  return cosineSimilarity;
  
}

async function getWordVector(b){
  const wordVector = {"id": b.id, "title": b.title, "wordList": {}, "sqrtSumSquares": 0};
  const wordsAll = b.title.toLowerCase().split(new RegExp("[ |\.|-|-|!|?|\(|\)|\||']+"))
  const urlMatch = b.url.match(/\/\/([^\/]+)\//);
  if (urlMatch) wordsAll.push(...b.url.match(/\/\/([^\/]+)\//)[1].split("."));
  const bodyWordsAll = await tryGetBodyText(b.url) || [];
  wordsAll.push(...bodyWordsAll);
  const wordsFiltered = wordsAll.filter(item => !stop_words.includes(item));
  wordsFiltered.forEach(function(word){
    if (wordVector.wordList[word]) {
      wordVector.wordList[word] += 1;
    }else{
      wordVector.wordList[word] = 1;
    }
  });

  let sumSquares = 0;
  for (const [key, value] of Object.entries(wordVector.wordList)) {
    sumSquares += value * value; 
  }
  wordVector.sqrtSumSquares = Math.sqrt(sumSquares);
  return wordVector;
}