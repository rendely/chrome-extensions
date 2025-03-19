(function() {
    let lastWidth = window.innerWidth;
  
    window.addEventListener('resize', () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
  
        // Send a message to the background script
        chrome.runtime.sendMessage({ type: 'resize' });
      }
    });

    
  })();