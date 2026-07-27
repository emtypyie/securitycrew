import type { TLSInfo } from "@shared/types";

export async function analyzeTLS(
  url: string,
  backendUrl?: string
): Promise<TLSInfo> {
  if (!url.startsWith("https://")) {
    return {
      valid: false,
      protocol: "none",
      selfSigned: false,
      weakCipher: false,
      mixedContent: false,
    };
  }

  if (backendUrl) {
    try {
      const resp = await fetch(
        `${backendUrl}/api/tls?domain=${encodeURIComponent(new URL(url).hostname)}`
      );
      if (resp.ok) return await resp.json();
    } catch {
      // fallback to basic analysis
    }
  }

  return basicTLSAnalysis(url);
}

function basicTLSAnalysis(url: string): TLSInfo {
  const parsed = new URL(url);
  const isHTTPS = parsed.protocol === "https:";

  return {
    valid: isHTTPS,
    protocol: isHTTPS ? "TLSv1.2+" : "none",
    selfSigned: false,
    weakCipher: false,
    mixedContent: false,
    issuer: "Unknown",
    daysUntilExpiry: undefined,
  };
}
