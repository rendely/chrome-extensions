console.log('profile script loaded');
tryExtract();

function tryExtract() {
  window.setTimeout(extractData, 500);
}

function extractData() {
  console.log('extracting...');
  try {
    const fullName = document.querySelector('h1').innerText;
    const experienceList = Array.from(document.querySelectorAll('section')).filter(e => !!e.querySelector('h2') && e.querySelector('h2').innerText === 'Experience\nExperience');
    const company1 = experienceList[0].querySelector('li span.t-bold span').innerText;
    const company2 = experienceList[0].querySelector('li span.t-normal span').innerText;
    const payload = { fullName: fullName, company1: company1, company2: company2 };
    chrome.runtime.sendMessage({ id: 'data', ...payload });
    chrome.runtime.sendMessage({ id: 'close' });
  } catch (e) {
    console.log(e);
    console.log('not ready yet');
    tryExtract()
  }
}