import type { FormAnalysis } from "@shared/types";
import { analyzeForms, injectWarningBanner } from "../services/form-analyzer";

let currentUrl = window.location.href;

function checkForms() {
  try {
    const analysis = analyzeForms(currentUrl);
    if (analysis.warning) {
      injectWarningBanner(analysis.warning);
    }
    chrome.runtime.sendMessage({
      type: "FORM_DATA",
      url: currentUrl,
      forms: {
        hasPasswordFields: analysis.hasPasswordFields,
        hasCreditCardFields: analysis.hasCreditCardFields,
        hasLoginForm: analysis.hasLoginForm,
        isHTTP: analysis.isHTTP,
        formCount: analysis.formCount,
        warning: analysis.warning,
      } satisfies FormAnalysis,
    });
  } catch {
    // silently fail on restricted pages
  }
}

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
