import type { FormAnalysis } from "@shared/types";

export function analyzeForms(url: string): FormAnalysis {
  const isHTTP = url.startsWith("http://") && !url.startsWith("https://");

  const forms = document.querySelectorAll("form");
  let hasPasswordFields = false;
  let hasCreditCardFields = false;
  let hasLoginForm = false;

  forms.forEach((form) => {
    const inputs = form.querySelectorAll("input");
    inputs.forEach((input) => {
      const type = input.type.toLowerCase();
      const name = (input.name || "").toLowerCase();
      const autocomplete = (input.autocomplete || "").toLowerCase();
      const placeholder = (input.placeholder || "").toLowerCase();

      if (type === "password") hasPasswordFields = true;

      if (
        type === "text" ||
        type === "tel" ||
        type === "number"
      ) {
        if (
          /card|credit|ccn|cc_number|payment/i.test(name) ||
          /card|credit|ccn/i.test(autocomplete) ||
          /card number|credit card/i.test(placeholder)
        ) {
          hasCreditCardFields = true;
        }
      }

      if (/login|signin|username|email|user/i.test(name)) {
        hasLoginForm = true;
      }
    });
  });

  let warning: string | null = null;
  if ((hasPasswordFields || hasCreditCardFields || hasLoginForm) && isHTTP) {
    warning =
      "Warning: You are about to enter sensitive information on an unencrypted (HTTP) connection. This data could be intercepted.";
  } else if (hasPasswordFields || hasCreditCardFields) {
    warning = null;
  }

  return {
    hasPasswordFields,
    hasCreditCardFields,
    hasLoginForm,
    isHTTP,
    formCount: forms.length,
    warning,
  };
}

export function injectWarningBanner(message: string): void {
  if (document.getElementById("compasscrew-warning")) return;

  const banner = document.createElement("div");
  banner.id = "compasscrew-warning";
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2147483647;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span style="flex:1"><strong>CompassCrew:</strong> ${message}</span>
      <button id="compasscrew-dismiss" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Dismiss</button>
    </div>
  `;

  document.body.prepend(banner);

  document.getElementById("compasscrew-dismiss")?.addEventListener("click", () => {
    banner.remove();
  });
}
