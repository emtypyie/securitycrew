import type { ReputationInfo } from "@shared/types";

export async function checkReputation(
  url: string,
  backendUrl?: string
): Promise<ReputationInfo> {
  const sources: ReputationInfo["sources"] = [];

  if (backendUrl) {
    try {
      const resp = await fetch(
        `${backendUrl}/api/reputation?url=${encodeURIComponent(url)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        return {
          status: data.status,
          sources: data.sources,
        };
      }
    } catch {
      // fallback to heuristic
    }
  }

  const heuristicStatus = heuristicReputationCheck(url);
  sources.push({
    name: "Heuristic Analysis",
    status: heuristicStatus,
  });

  return {
    status: heuristicStatus,
    sources,
  };
}

function heuristicReputationCheck(
  url: string
): "safe" | "suspicious" | "malicious" | "unknown" {
  let risk = 0;

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "http:") risk += 20;

    const hostname = parsed.hostname;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) risk += 30;

    const parts = hostname.split(".");
    if (parts.length > 4) risk += 15;

    const tld = parts[parts.length - 1]?.toLowerCase();
    const suspiciousTlds = ["xyz", "top", "tk", "ml", "ga", "cf", "pw", "buzz"];
    if (suspiciousTlds.includes(tld)) risk += 15;

    const path = parsed.pathname + parsed.search;
    if (/login|signin|auth|verify|account|password|update|secure/i.test(path)) {
      risk += 10;
    }

    if (/[а-яА-Я]/.test(hostname) || /[^\x00-\x7F]/.test(hostname)) {
      risk += 20;
    }
  } catch {
    risk += 40;
  }

  if (risk >= 50) return "malicious";
  if (risk >= 25) return "suspicious";
  if (risk > 0) return "unknown";
  return "safe";
}
