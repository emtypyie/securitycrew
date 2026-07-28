export async function checkReputation(url, backendUrl) {
  const sources = [];
  if (backendUrl) {
    try {
      const resp = await fetch(`${backendUrl}/api/reputation?url=${encodeURIComponent(url)}`);
      if (resp.ok) {
        const data = await resp.json();
        return { status: data.status, sources: data.sources };
      }
    } catch {}
  }
  const heuristicStatus = heuristicReputationCheck(url);
  sources.push({ name: "Heuristic Analysis", status: heuristicStatus });
  return { status: heuristicStatus, sources };
}

function heuristicReputationCheck(url) {
  let risk = 0;
  let signals = 0;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:") { risk += 15; signals++; }
    const hostname = parsed.hostname;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) { risk += 30; signals++; }
    const parts = hostname.split(".");
    if (parts.length > 4) { risk += 10; signals++; }
    const tld = parts[parts.length - 1]?.toLowerCase();
    const suspiciousTlds = ["xyz", "top", "tk", "ml", "ga", "cf", "pw", "buzz", "club", "work", "site", "online", "tech", "fun", "icu", "monster", "surf"];
    if (suspiciousTlds.includes(tld || "")) { risk += 20; signals++; }
    const trustedDomains = [
      "google.com", "github.com", "microsoft.com", "apple.com", "amazon.com",
      "facebook.com", "twitter.com", "linkedin.com", "youtube.com", "netflix.com",
      "reddit.com", "wikipedia.org", "stackoverflow.com", "npmjs.com", "vercel.com",
      "cloudflare.com", "mozilla.org", "ubuntu.com", "debian.org", "fedora.org",
      "docker.com", "kubernetes.io", "python.org", "nodejs.org", "rust-lang.org",
      "gitlab.com", "bitbucket.org", "atlassian.com", "slack.com", "notion.so",
      "figma.com", "adobe.com", "zoom.us", "dropbox.com", "spotify.com",
      "twitch.tv", "discord.com", "medium.com", "substack.com", "openai.com",
      "anthropic.com", "huggingface.co", "replit.com", "codesandbox.io",
    ];
    const baseDomain = parts.slice(-2).join(".");
    if (trustedDomains.includes(baseDomain) || trustedDomains.includes(hostname)) { risk -= 30; }
    const path = parsed.pathname + parsed.search;
    if (/login|signin|auth|verify|account|password|update|secure|banking/i.test(path)) {
      if (!trustedDomains.some((d) => hostname.endsWith(d))) { risk += 5; signals++; }
    }
    if (/[^\x00-\x7F]/.test(hostname)) { risk += 20; signals++; }
    if (hostname.length > 40) { risk += 5; signals++; }
  } catch { risk += 40; signals++; }
  if (signals === 0 && risk <= 0) return "safe";
  if (risk >= 50) return "malicious";
  if (risk >= 25) return "suspicious";
  if (risk > 0) return "unknown";
  return "safe";
}
