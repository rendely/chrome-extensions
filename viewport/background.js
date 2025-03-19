// Map to track active debugger attachments
const debuggerAttached = new Map();

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setViewport') {
    setViewport(message.tabId, message.width, message.deviceType, sendResponse);
    return true; // Keep the message channel open for the async response
  } else if (message.action === 'resetViewport') {
    resetViewport(message.tabId, sendResponse);
    return true; // Keep the message channel open for the async response
  }
});

// Detach debugger when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (debuggerAttached.has(tabId)) {
    try {
      chrome.debugger.detach({ tabId });
    } catch (error) {
      console.error('Error detaching debugger:', error);
    }
    debuggerAttached.delete(tabId);
  }
});

// Function to set viewport width
async function setViewport(tabId, width, deviceType, sendResponse) {
  try {
    // Attach debugger if not already attached
    if (!debuggerAttached.has(tabId)) {
      await attachDebugger(tabId);
      debuggerAttached.set(tabId, true);
    }
    
    // Create the device metrics
    const metrics = {
      width: width,
      height: 0, // Auto height
      deviceScaleFactor: 1,
      mobile: deviceType === 'mobile',
      screenWidth: width,
      screenHeight: 800, // Default screen height
      positionX: 0,
      positionY: 0,
      scale: 1,
      screenOrientation: { angle: 0, type: 'portraitPrimary' }
    };
    
    // Execute the CDP command
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', metrics);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error setting viewport:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Function to reset viewport to default
async function resetViewport(tabId, sendResponse) {
  try {
    if (debuggerAttached.has(tabId)) {
      // Clear the emulation
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride');
      
      // Detach debugger
      await chrome.debugger.detach({ tabId });
      debuggerAttached.delete(tabId);
      
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Debugger not attached' });
    }
  } catch (error) {
    console.error('Error resetting viewport:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Helper function to attach debugger
function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}