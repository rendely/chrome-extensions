
responseDiv = document.getElementById('response');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'write') {
    responseDiv.innerText += request.text;
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { type: 'fetchBodyText' }, (response) => {
      if (response && response.text) {
        chrome.runtime.sendMessage({type: 'fetchCode', prompt: `${response.text}\nSummarize the above`});
      } else {
        responseDiv.innerText += 'Unable to fetch body text.';
      }
    });
  });