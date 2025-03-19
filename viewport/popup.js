document.addEventListener('DOMContentLoaded', function() {
  const applyBtn = document.getElementById('applyBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  
  // Apply viewport width
  applyBtn.addEventListener('click', function() {
    const width = parseInt(document.getElementById('width').value);
    const deviceType = document.getElementById('device-type').value;
    
    if (isNaN(width) || width < 320 || width > 2560) {
      status.textContent = 'Please enter a valid width between 320 and 2560px';
      return;
    }
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tabId = tabs[0].id;
      chrome.runtime.sendMessage({
        action: 'setViewport',
        tabId: tabId,
        width: width,
        deviceType: deviceType
      }, function(response) {
        if (response && response.success) {
          status.textContent = `Viewport width set to ${width}px`;
        } else {
          status.textContent = response.error || 'An error occurred';
        }
      });
    });
  });
  
  // Reset viewport
  resetBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tabId = tabs[0].id;
      chrome.runtime.sendMessage({
        action: 'resetViewport',
        tabId: tabId
      }, function(response) {
        if (response && response.success) {
          status.textContent = 'Viewport reset to default';
        } else {
          status.textContent = response.error || 'An error occurred';
        }
      });
    });
  });
});