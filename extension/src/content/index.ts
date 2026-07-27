import { analyzeForms, injectWarningBanner } from "../services/form-analyzer";

let currentUrl = window.location.href;

function checkForms() {
  try {
    const analysis = analyzeForms(currentUrl);
    if (analysis.warning) {
      injectWarningBanner(analysis.warning);
    }
  } catch {
    // silently fail on restricted pages
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "HEADERS_COLLECTED" && message.url === currentUrl) {
    // headers received for current page, could re-analyze if needed
  }
});

checkForms();

const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    checkForms();
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});

console.log("CompassCrew content script loaded.");
