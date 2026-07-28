const HEADER_DEFINITIONS = [
  { name: "Strict-Transport-Security", severity: "high", recommendation: "Configure HSTS to force HTTPS connections", description: "Forces browsers to use HTTPS, preventing protocol downgrade attacks" },
  { name: "Content-Security-Policy", severity: "high", recommendation: "Configure CSP to restrict script execution sources", description: "Prevents XSS and data injection attacks by restricting resource loading" },
  { name: "X-Frame-Options", severity: "medium", recommendation: "Set X-Frame-Options to DENY or SAMEORIGIN", description: "Prevents clickjacking by controlling iframe embedding" },
  { name: "X-Content-Type-Options", severity: "medium", recommendation: "Set X-Content-Type-Options to nosniff", description: "Prevents MIME-type sniffing attacks" },
  { name: "Referrer-Policy", severity: "low", recommendation: "Set Referrer-Policy to limit referrer information", description: "Controls how much referrer information is shared" },
  { name: "Permissions-Policy", severity: "low", recommendation: "Configure Permissions-Policy to restrict feature access", description: "Controls which browser features the site can use" },
  { name: "Cross-Origin-Opener-Policy", severity: "medium", recommendation: "Set COOP to same-origin", description: "Isolates the browsing context to prevent cross-origin attacks" },
  { name: "Cross-Origin-Embedder-Policy", severity: "low", recommendation: "Set COEP to require-corp", description: "Prevents loading cross-origin resources without explicit permission" },
];

export function analyzeHeaders(responseHeaders) {
  const normalized = {};
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      normalized[key.toLowerCase()] = value;
    }
  }
  return HEADER_DEFINITIONS.map((def) => {
    const value = normalized[def.name.toLowerCase()];
    return { ...def, present: !!value, value: value || undefined };
  });
}
