import type { DomainInfo } from "@shared/types";

const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "club", "work", "buzz", "tk", "ml", "ga", "cf", "gq",
  "pw", "cc", "ws", "info", "biz", "click", "download", "link", "online",
  "site", "tech", "space", "fun", "icu", "monster", "surf", "rest",
]);

const COMMON_BRANDS = [
  "google", "facebook", "amazon", "apple", "microsoft", "netflix",
  "paypal", "instagram", "twitter", "linkedin", "github", "dropbox",
  "银行", "alipay", "wechat", "whatsapp", "telegram", "steam",
];

const CHAR_SUBSTITUTIONS: Record<string, string[]> = {
  a: ["а", "ạ", "à", "á", "ä", "å", "ɑ"],
  e: ["е", "ё", "ε", "é", "è", "ê", "ë", "ė"],
  i: ["і", "ι", "í", "ì", "ï", "ı"],
  o: ["о", "ο", "ó", "ò", "ö", "ő", "0"],
  p: ["р", "ρ"],
  c: ["с", "ϲ", "ç"],
  x: ["х", "×"],
  y: ["у", "ý"],
  s: ["ѕ", "ʂ"],
  u: ["µ", "ù", "ú", "ü", "ű"],
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function hasHomographChars(domain: string): boolean {
  for (const char of domain) {
    for (const subs of Object.values(CHAR_SUBSTITUTIONS)) {
      if (subs.includes(char)) return true;
    }
  }
  return false;
}

function detectTyposquatting(domain: string): boolean {
  const baseDomain = domain.split(".")[0].toLowerCase();
  for (const brand of COMMON_BRANDS) {
    if (baseDomain === brand) continue;
    const dist = levenshteinDistance(baseDomain, brand);
    if (dist <= 2 && baseDomain.length > 2) return true;
    if (baseDomain.includes(brand) && baseDomain !== brand) return true;
  }
  return false;
}

export function analyzeDomain(url: string): DomainInfo {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      domain: url,
      suspiciousTLD: false,
      typosquatting: false,
      homographAttack: false,
      ipBasedURL: false,
      excessiveSubdomains: false,
      urlShortener: false,
      suspiciousScore: 50,
    };
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

  return {
    domain: hostname,
    suspiciousTLD,
    typosquatting,
    homographAttack,
    ipBasedURL,
    excessiveSubdomains,
    urlShortener: false,
    suspiciousScore: Math.min(100, suspiciousScore),
  };
}

export async function getDomainAge(
  domain: string,
  backendUrl?: string
): Promise<Partial<DomainInfo>> {
  if (backendUrl) {
    try {
      const resp = await fetch(
        `${backendUrl}/api/whois?domain=${encodeURIComponent(domain)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        return {
          ageDays: data.ageDays,
          registrar: data.registrar,
          creationDate: data.creationDate,
        };
      }
    } catch {
      // fallback
    }
  }
  return {};
}
