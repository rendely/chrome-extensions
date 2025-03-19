(function() {
    let lastWidth = window.innerWidth;
  
    window.addEventListener('resize', () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
  
        // Send a message to the background script
        // chrome.runtime.sendMessage({ type: 'resize' });
      }
    });

    
      let frame = document.createElement("div");
      frame.style.position = "fixed";
      frame.style.top = "0";
      frame.style.left = "0";
      frame.style.width = "100%";
      frame.style.height = "100%";
      // frame.style.padding = "5vw"; // Adjust border size
      frame.style.boxSizing = "border-box";
      frame.style.background = "linear-gradient(45deg, rgb(188 184 255) 0%, rgb(70 53 130) 35%, rgb(90 112 222) 100%)"; // Color of the border
      frame.style.overflow = "hidden";
      frame.style.display = "flex";
      

      
      let content = document.createElement("div");
      content.style.overflow = "auto";
      content.style.margin = "auto";
      content.style.maxHeight = "95vh";
      content.style.aspectRatio = "1"; 
      // content.style.width = "100%";
      // content.style.height = "100%";
      content.style.backgroundColor = "lightgray"; // Background of the page
      content.style.borderRadius = "15px"; // Rounded corners inside the frame
      content.style.boxShadow = "black 0 0 30px"
      
      while (document.body.firstChild) {
          content.appendChild(document.body.firstChild);
      }
      
      document.body.appendChild(frame);
      frame.appendChild(content);
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";

      function reanchorFixedElements() {
        document.querySelectorAll("*").forEach(el => {
          if (el !== content) {
            let style = window.getComputedStyle(el);
            if (style.position === "fixed") {
                // Convert fixed position to absolute
                el.style.position = "absolute";
                
                // Adjust position relative to the new content div
                let rect = el.getBoundingClientRect();
                el.style.top = rect.top + "px";
                el.style.left = rect.left + "px";
                el.style.right = "auto"; // Prevent stretching
                el.style.bottom = "auto"; // Prevent stretching
    
                // Move it inside the content frame
                content.appendChild(el);
            }
          }
        });
    }
    
    // Call function after moving the content inside the frame
    reanchorFixedElements();

    
  })();