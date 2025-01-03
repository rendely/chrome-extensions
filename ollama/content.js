chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'fetchBodyText') {
      const bodyText = document.body.innerText;
      sendResponse({ text: bodyText });
    }
  });