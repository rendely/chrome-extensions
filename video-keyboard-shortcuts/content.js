if (document.URL.match('youtube.com|amazon.com/gp/video')) {

  document.addEventListener('keydown', videoControls);

  document.addEventListener('DOMContentLoaded', (event) => {
    const targetNode = document.body;
    if (targetNode && document.URL.match('youtube.com')) {
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  });

}

function videoControls(e) {
  e.stopImmediatePropagation();


  adjustVideoTime(e);
  // clickSkipButtons();
}

function clickSkipButtons(skipButtons) {
  console.log('Skip button');
  console.log(skipButtons);
  setTimeout(() => {
    skipButtons.forEach(button => button.click());
  }, 1000)
}

function adjustVideoTime(e) {

  const videos = Array.from(document.querySelectorAll('video'))
    .filter(vid => vid.duration > 0 && vid.checkVisibility());

  if (!videos.length) return;

  const mainVideo = videos.sort((a, b) => b.duration - a.duration)[0];
  let targetTime = mainVideo.currentTime;

  if (e.code === 'KeyE') targetTime += e.shiftKey ? 300 : 30;
  if (e.code === 'KeyW') targetTime -= e.shiftKey ? 300 : 30;

  if (['KeyE', 'KeyW'].includes(e.code)) {
    setTimeout(() => mainVideo.currentTime = targetTime, 300);
  }

  if (e.code === 'KeyR') removeScrims();
}

function removeScrims() {
  document.querySelectorAll('*').forEach(el => {
    console.log('remove scrim');
    if (window.getComputedStyle(el).backgroundImage.includes('linear-gradient')) {
      el.remove();
    }
  });
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {

      if (node.nodeType === Node.ELEMENT_NODE) {
        const skipButtons = document.querySelectorAll("[id*='skip-button'] > span > button, [class*='skip' i],#ad-text");
        if (skipButtons.length > 0) clickSkipButtons(skipButtons);
        if (node.nodeName === 'VIDEO') {
          console.log(node);
          console.log(node.duration);
          // clickSkipButtons();
        }
      }
    });
  });
});


