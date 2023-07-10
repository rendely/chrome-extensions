let isShift = false;

document.addEventListener('keydown', setShift);
document.addEventListener('keyup', unSetShift);
document.addEventListener('keydown', videoControls);

function setShift(e){
  if (e.key == 'Shift') isShift = true
  console.log(isShift)
}
function unSetShift(e){
  if (e.key == 'Shift') isShift = false
  console.log(isShift)
}

function videoControls(e){
  e.stopImmediatePropagation();
  let skip = document.querySelector("#skip-button\\:5 > span > button");
  if (skip) skip.click();
  let videos = document.querySelectorAll('video');
  let v = Array.from(videos).filter(vid => vid.duration > 0 && vid.checkVisibility())[0];
  if (e.key == 'ArrowRight') targetTime = v.currentTime + (isShift ? 300 : 30);
  if (e.key == 'ArrowLeft') targetTime = v.currentTime - (isShift ? 300 : 30);
  console.log(targetTime);

  window.setTimeout(() =>{
    v.currentTime = targetTime;
    console.log('super skip');
    console.log(isShift)
  }
   , 500);
    
  
  console.log('skipped');
}