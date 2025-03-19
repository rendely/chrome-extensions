// background.js
async function adjustZoom() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;
  
      const tabId = tabs[0].id;
  
      const executeResult = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          return window.innerWidth;
        }
      });
      const innerWidth = executeResult[0].result;
      
      let currentZoom = await chrome.tabs.getZoom(tabId);
      let targetZoom =  (innerWidth * currentZoom) / 1200;

    // 1000, 1000, 0.5 => 0.5
    // 1000, 500, 1 => 0.5
      
      console.log(innerWidth,currentZoom, targetZoom);
  
      // Apply zoom with some limits
      targetZoom = Math.max(0.2, Math.min(targetZoom, 3.0)); // Limit zoom between 20% and 300%
  
      await chrome.tabs.setZoom(tabId, targetZoom);
  
    } catch (error) {
      console.error("Error adjusting zoom:", error);
    }
  }
  
  // Run when a tab is activated / updated
  chrome.tabs.onActivated.addListener(adjustZoom);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      adjustZoom();
    }
  });

  chrome.windows.onBoundsChanged.addListener(adjustZoom
  );

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'resize') {
      adjustZoom();
    }
  });
  
  // Also, run on startup
  chrome.runtime.onStartup.addListener(adjustZoom);