document.addEventListener('keydown', videoControls);

function videoControls(e) {
  const video = getMostLikelyVideo();

  if (video && !video.paused) {
    const currentTime = video.currentTime;
    const duration = video.duration;
    console.log(e.code);
    console.log(currentTime);

    // Seek controls
    if (e.code === 'KeyE') video.currentTime = currentTime + 30;
    if (e.code === 'KeyW') video.currentTime = currentTime - 30;

    // Skip to section controls
    if (e.code === 'Digit0') video.currentTime = 0;
    if (e.code === 'Digit1') video.currentTime = duration / 10;
    if (e.code === 'Digit2') video.currentTime = duration / 10 * 2;
    if (e.code === 'Digit3') video.currentTime = duration / 10 * 3;
    if (e.code === 'Digit4') video.currentTime = duration / 10 * 4;
    if (e.code === 'Digit5') video.currentTime = duration / 10 * 5;
    if (e.code === 'Digit6') video.currentTime = duration / 10 * 6;
    if (e.code === 'Digit7') video.currentTime = duration / 10 * 7;
    if (e.code === 'Digit8') video.currentTime = duration / 10 * 8;
    if (e.code === 'Digit9') video.currentTime = duration / 10 * 9;

    // Remove scrim
    if (e.code === 'KeyR') removeScrims()

    e.stopImmediatePropagation();
  }
}

function getMostLikelyVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  const playingVideos = videos.filter(v => !v.paused);
  const sortedVideos = playingVideos.sort((a, b) => a.videoWidth - b.videoWidth);
  console.log(sortedVideos);
  if (sortedVideos.length === 0) return undefined
  return sortedVideos[0];

}

function removeScrims() {
  document.querySelectorAll('*').forEach(el => {
    console.log('remove scrim');
    if (window.getComputedStyle(el).backgroundImage.includes('linear-gradient')) {
      el.remove();
    }
  });
}