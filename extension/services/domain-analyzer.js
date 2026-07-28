const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "club", "work", "buzz", "tk", "ml", "ga", "cf", "gq",
  "pw", "cc", "ws", "info", "biz", "click", "download", "link", "online",
  "site", "tech", "space", "fun", "icu", "monster", "surf", "rest",
]);

const COMMON_BRANDS = [
  "google", "facebook", "amazon", "apple", "microsoft", "netflix",
  "paypal", "instagram", "twitter", "linkedin", "github", "dropbox",
  "alipay", "wechat", "whatsapp", "telegram", "steam",
];

const CHAR_SUBSTITUTIONS = {
  a: ["\u0430", "\u1ea1", "\u00e0", "\u00e1", "\u00e4", "\u00e5", "\u0251"],
  e: ["\u0435", "\u0451", "\u03b5", "\u00e9", "\u00e8", "\u00ea", "\u00eb", "\u0117"],
  i: ["\u0456", "\u03b9", "\u00ed", "\u00ec", "\u00ef", "\u0131"],
  o: ["\u043e", "\u03bf", "\u00f3", "\u00f2", "\u00f6", "\u0151", "0"],
  p: ["\u0440", "\u03c1"],
  c: ["\u0441", "\u03f2", "\u00e7"],
  x: ["\u0445", "\u00d7"],
  y: ["\u0443", "\u00fd"],
  s: ["\u0455", "\u0285"],
  u: ["\u00b5", "\u00f9", "\u00fa", "\u00fc", "\u0171"],
};

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function hasHomographChars(domain) {
  for (const char of domain) {
    for (const subs of Object.values(CHAR_SUBSTITUTIONS)) {
      if (subs.includes(char)) return true;
    }
  }
  return false;
}

function detectTyposquatting(domain) {
  const baseDomain = domain.split(".")[0].toLowerCase();
  for (const brand of COMMON_BRANDS) {
    if (baseDomain === brand) continue;
    const dist = levenshteinDistance(baseDomain, brand);
    if (dist <= 2 && baseDomain.length > 2) return true;
    if (baseDomain.includes(brand) && baseDomain !== brand) return true;
  }
  return false;
}

export function analyzeDomain(url) {
  let parsed;
  try { parsed = new URL(url); } catch {
    return { domain: url, suspiciousTLD: false, typosquatting: false, homographAttack: false, ipBasedURL: false, excessiveSubdomains: false, urlShortener: false, suspiciousScore: 50 };
  }
  const hostname = parsed.hostname;
  const parts = hostname.split(".");
  const tld = parts[parts.length - 1]?.toLowerCase() || "";
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipBasedURL = ipRegex.test(hostname);
  const suspiciousTLD = SUSPICIOUS_TLDS.has(tld);
  const excessiveSubdomains = parts.length > 4;
  const homographAttack = hasHomographChars(hostname);
  const typosquatting = detectTyposquatting(hostname);
  let suspiciousScore = 0;
  if (suspiciousTLD) suspiciousScore += 20;
  if (typosquatting) suspiciousScore += 30;
  if (homographAttack) suspiciousScore += 35;
  if (ipBasedURL) suspiciousScore += 25;
  if (excessiveSubdomains) suspiciousScore += 10;
  return { domain: hostname, suspiciousTLD, typosquatting, homographAttack, ipBasedURL, excessiveSubdomains, urlShortener: false, suspiciousScore: Math.min(100, suspiciousScore) };
}

export async function getDomainAge(domain, backendUrl) {
  if (backendUrl) {
    try {
      const resp = await fetch(`${backendUrl}/api/whois?domain=${encodeURIComponent(domain)}`);
      if (resp.ok) {
        const data = await resp.json();
        return { ageDays: data.ageDays, registrar: data.registrar, creationDate: data.creationDate };
      }
    } catch {}
  }
  return {};
}
