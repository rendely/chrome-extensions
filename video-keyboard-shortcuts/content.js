
document.addEventListener('keydown', videoControls);

function videoControls(e) {
  e.stopImmediatePropagation();
  if (!document.URL.match('youtube.com|amazon.com|twitch.tv')) return;

  let skip = document.querySelector("[id*='skip-button'] > span > button");
  if (skip) {skip.click(); return;}

  let videos = document.querySelectorAll('video');
  let v = Array.from(videos).filter(vid => vid.duration > 0 && vid.checkVisibility());
  v = v.sort((a, b) => b.duration - a.duration)[0];
  if (v.length === 0) return;

  if (e.code === 'KeyE') targetTime = v.currentTime + (e.shiftKey ? 300 : 30);
  if (e.code === 'KeyW') targetTime = v.currentTime - (e.shiftKey ? 300 : 30);
  if (e.code === 'KeyR') removeScrims();
  if (e.code === 'KeyW' || e.code == 'KeyE') {

    window.setTimeout(() => {
      console.log('seeked');
      v.currentTime = targetTime;
    }
      , 300);
  }

}

function removeScrims() {
  console.log('removing scrims')
  // get all elements on the page
  let allElements = document.querySelectorAll('*');

  allElements.forEach(function (element) {
    // get the computed style of each element
    let style = window.getComputedStyle(element);

    // check if the background-image property contains a linear-gradient
    if (style.backgroundImage.includes('linear-gradient')) {
      element.remove();
    }
  });
  document.querySelector('.FliptrayWrapper').classList.remove('FliptrayWrapper');
}