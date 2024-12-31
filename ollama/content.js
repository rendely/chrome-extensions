chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'fetchBodyText') {
      const bodyText = document.body.innerText.slice(0, 2000); // Fetch up to 2000 characters
      sendResponse({ text: bodyText });
    }
  });