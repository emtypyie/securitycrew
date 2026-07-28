export async function analyzeTLS(url, backendUrl) {
  if (!url.startsWith("https://")) {
    return { valid: false, protocol: "none", selfSigned: false, weakCipher: false, mixedContent: false };
  }
  if (backendUrl) {
    try {
      const resp = await fetch(`${backendUrl}/api/tls?domain=${encodeURIComponent(new URL(url).hostname)}`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) return await resp.json();
    } catch {}
  }
  return await probeTLS(url);
}

async function probeTLS(url) {
  try {
    await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return { valid: true, selfSigned: false, weakCipher: false, mixedContent: false, issuer: "Valid (issuer details require backend)", protocol: "TLSv1.2+" };
  } catch {
    return { valid: false, selfSigned: false, weakCipher: false, mixedContent: false, issuer: "Unknown", protocol: "unknown" };
  }
}
