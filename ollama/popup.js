
responseDiv = document.getElementById('response');
let responseText = '';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'write') {
    responseText += request.text;
    responseDiv.innerText = responseText;
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { type: 'fetchBodyText' }, (response) => {
      if (response && response.text) {
        responseDiv.innerText += `Num chars: ${response.text.length}\n`;
        chrome.runtime.sendMessage({type: 'fetchCode', prompt: `${response.text.slice(0, 30000)}\nSummarize the above`});
      } else {
        responseDiv.innerText += 'Unable to fetch body text.';
      }
    });
  });