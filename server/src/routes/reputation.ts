import { Router } from "express";

export const reputationRouter = Router();

interface ReputationSource {
  name: string;
  status: "safe" | "suspicious" | "malicious" | "unknown";
  url?: string;
}

interface ReputationResult {
  status: "safe" | "suspicious" | "malicious" | "unknown";
  sources: ReputationSource[];
}

// Google Safe Browsing API v4 (requires API key)
async function checkGoogleSafeBrowsing(
  url: string,
  apiKey?: string
): Promise<ReputationSource> {
  if (!apiKey) {
    return { name: "Google Safe Browsing", status: "unknown" };
  }

  try {
    const resp = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "compasscrew", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!resp.ok) return { name: "Google Safe Browsing", status: "unknown" };

    const data = await resp.json();
    if (data.matches && data.matches.length > 0) {
      return { name: "Google Safe Browsing", status: "malicious" };
    }
    return { name: "Google Safe Browsing", status: "safe" };
  } catch {
    return { name: "Google Safe Browsing", status: "unknown" };
  }
}

// URLHaus API
async function checkURLHaus(url: string): Promise<ReputationSource> {
  try {
    const resp = await fetch("https://urlhaus-api.abuse.ch/v1/url/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return { name: "URLHaus", status: "unknown" };

    const data = await resp.json();
    if (data.query_status === "no_results") {
      return { name: "URLHaus", status: "safe" };
    }
    if (data.threat) {
      return { name: "URLHaus", status: "malicious" };
    }
    return { name: "URLHaus", status: "safe" };
  } catch {
    return { name: "URLHaus", status: "unknown" };
  }
}

// Heuristic check (always available)
function heuristicCheck(url: string): ReputationSource {
  let risk = 0;

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "http:") risk += 2;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname)) risk += 3;
    if (parsed.hostname.split(".").length > 4) risk += 1;

    const tlds = ["xyz", "top", "tk", "ml", "ga", "cf", "pw", "buzz"];
    if (tlds.includes(parsed.hostname.split(".").pop() || "")) risk += 1;
  } catch {
    risk += 4;
  }

  if (risk >= 5) return { name: "Heuristic Analysis", status: "malicious" };
  if (risk >= 2) return { name: "Heuristic Analysis", status: "suspicious" };
  return { name: "Heuristic Analysis", status: "safe" };
}

reputationRouter.get("/", async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ error: "url parameter is required" });
    return;
  }

  const apiKey = process.env.GOOGLE_SAFEBROWSING_API_KEY;

  const [google, urlhaus, heuristic] = await Promise.all([
    checkGoogleSafeBrowsing(url, apiKey),
    checkURLHaus(url),
    Promise.resolve(heuristicCheck(url)),
  ]);

  const sources = [google, urlhaus, heuristic];

  // Determine overall status
  const statuses = sources.map((s) => s.status);
  let overall: ReputationResult["status"] = "safe";
  if (statuses.includes("malicious")) overall = "malicious";
  else if (statuses.includes("suspicious")) overall = "suspicious";
  else if (statuses.every((s) => s === "unknown")) overall = "unknown";

  res.json({ status: overall, sources });
});
