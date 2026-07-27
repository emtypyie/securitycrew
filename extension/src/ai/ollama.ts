import type { SecurityReport, ChatMessage } from "@shared/types";

let cachedSettings: { ollamaUrl: string; ollamaModel: string } | null = null;

async function getSettings(): Promise<{ ollamaUrl: string; ollamaModel: string }> {
  if (cachedSettings) return cachedSettings;
  try {
    const stored = await chrome.storage.local.get("settings");
    const s = stored.settings || {};
    cachedSettings = {
      ollamaUrl: s.ollamaUrl || "http://localhost:11434",
      ollamaModel: s.ollamaModel || "llama3.2:3b",
    };
    return cachedSettings;
  } catch {
    return { ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.2:3b" };
  }
}

// Check if Ollama is reachable
let ollamaAvailable: boolean | null = null;

export async function isOllamaAvailable(): Promise<boolean> {
  if (ollamaAvailable !== null) return ollamaAvailable;
  const settings = await getSettings();
  try {
    const resp = await fetch(`${settings.ollamaUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    ollamaAvailable = resp.ok;
    return ollamaAvailable;
  } catch {
    ollamaAvailable = false;
    return false;
  }
}

// Reset cache (called when settings change)
export function resetAICache(): void {
  cachedSettings = null;
  ollamaAvailable = null;
}

function buildReportPrompt(report: SecurityReport): string {
  const presentHeaders = report.headers.filter((h) => h.present).map((h) => h.name);
  const missingHeaders = report.headers.filter((h) => !h.present).map((h) => h.name);

  return `Analyze this website's security and give a plain-English summary.

Website: ${report.url}
Security Score: ${report.score.total}/100 (Grade: ${report.score.grade}, Risk: ${report.score.riskLevel})
HTTPS: ${report.https ? "Yes" : "NO — data is unencrypted"}
TLS Certificate: ${report.tls.valid ? "Valid" : "INVALID"}${report.tls.issuer ? `, Issuer: ${report.tls.issuer}` : ""}${report.tls.protocol ? `, Protocol: ${report.tls.protocol}` : ""}
Present Headers (${presentHeaders.length}/${report.headers.length}): ${presentHeaders.join(", ") || "None"}
Missing Headers: ${missingHeaders.join(", ") || "None"}
Domain: ${report.domain.domain}${report.domain.ageDays ? `, Age: ${report.domain.ageDays} days` : ""}
Phishing Signals: ${[
  report.domain.suspiciousTLD && "Suspicious TLD",
  report.domain.typosquatting && "Typosquatting",
  report.domain.homographAttack && "Homograph Attack",
  report.domain.ipBasedURL && "IP-based URL",
  report.domain.excessiveSubdomains && "Too many subdomains",
].filter(Boolean).join(", ") || "None"}
Reputation: ${report.reputation.status}
Forms: ${report.forms.hasPasswordFields ? "Password fields detected" : "None"}${report.forms.isHTTP ? " (UNENCRYPTED)" : ""}

Write 3-5 sentences. Start with the overall assessment. Mention specific issues found. End with a clear recommendation.`;
}

export async function generateSummary(report: SecurityReport): Promise<string> {
  const settings = await getSettings();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [
          {
            role: "system",
            content: `You are a cybersecurity advisor named CompassCrew. You explain website security in simple, everyday language. Be specific about what you find. Never use technical jargon without explaining it. Keep responses under 100 words.`,
          },
          { role: "user", content: buildReportPrompt(report) },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

    const data = await response.json();
    const content = data.message?.content;
    if (content && content.length > 20) {
      ollamaAvailable = true;
      return content;
    }
    throw new Error("Empty response from Ollama");
  } catch {
    ollamaAvailable = false;
    return generateFallbackSummary(report);
  }
}

function generateFallbackSummary(report: SecurityReport): string {
  const score = report.score.total;
  const grade = report.score.grade;
  const parts: string[] = [];

  // Overall assessment
  if (score >= 85) {
    parts.push(`${report.domain.domain} looks safe (Score: ${score}/100, Grade: ${grade}).`);
  } else if (score >= 60) {
    parts.push(`${report.domain.domain} has some security concerns (Score: ${score}/100, Grade: ${grade}).`);
  } else if (score >= 30) {
    parts.push(`${report.domain.domain} has significant security issues (Score: ${score}/100, Grade: ${grade}).`);
  } else {
    parts.push(`${report.domain.domain} appears DANGEROUS (Score: ${score}/100, Grade: ${grade}).`);
  }

  // HTTPS
  if (!report.https) {
    parts.push("This site does NOT use HTTPS — any data you send (passwords, messages) can be intercepted by anyone on the same network.");
  }

  // TLS issues
  if (report.tls.selfSigned) {
    parts.push("The security certificate is self-signed, meaning the site's identity cannot be verified.");
  }
  if (report.tls.weakCipher) {
    parts.push("This site uses outdated encryption that could be broken by attackers.");
  }

  // Headers
  const missingHigh = report.headers.filter((h) => !h.present && (h.severity === "high" || h.severity === "critical"));
  const presentCount = report.headers.filter((h) => h.present).length;
  const totalCount = report.headers.length;

  if (missingHigh.length > 0) {
    parts.push(`Missing critical security headers: ${missingHigh.map((h) => h.name).join(", ")}. This makes the site vulnerable to attacks like XSS and clickjacking.`);
  } else if (presentCount < totalCount) {
    parts.push(`Has ${presentCount} of ${totalCount} security headers configured.`);
  }

  // Domain/phishing
  if (report.domain.homographAttack) {
    parts.push("WARNING: This domain uses special characters that mimic a real brand name (homograph attack) — this is a strong phishing indicator.");
  }
  if (report.domain.typosquatting) {
    parts.push("WARNING: This domain name looks like a misspelling of a well-known site — possible phishing attempt.");
  }
  if (report.domain.suspiciousTLD) {
    parts.push("This domain uses a top-level domain (.xyz, .top, etc.) commonly associated with scam sites.");
  }

  // Reputation
  if (report.reputation.status === "malicious") {
    parts.push("This site is flagged as MALICIOUS by security databases. Do NOT enter any personal information.");
  } else if (report.reputation.status === "suspicious") {
    parts.push("This site has been flagged as suspicious by security sources.");
  }

  // Forms
  if (report.forms.isHTTP && (report.forms.hasPasswordFields || report.forms.hasCreditCardFields)) {
    parts.push("You are about to type sensitive information into an UNENCRYPTED connection — this data can be stolen.");
  }

  // Recommendation
  if (score >= 80) {
    parts.push("Safe for normal browsing. Still be cautious with sensitive data on any site.");
  } else if (score >= 50) {
    parts.push("Browse with caution. Avoid entering passwords or payment information here.");
  } else {
    parts.push("Do NOT enter personal or payment information on this site.");
  }

  return parts.join(" ");
}

export async function chatWithAI(
  messages: ChatMessage[],
  reportContext?: SecurityReport
): Promise<string> {
  const settings = await getSettings();

  const contextPrompt = reportContext
    ? `Current website: ${reportContext.url}\nScore: ${reportContext.score.total}/100 (${reportContext.score.grade})\nRisk: ${reportContext.score.riskLevel}\nHTTPS: ${reportContext.https}\nPresent headers: ${reportContext.headers.filter((h) => h.present).map((h) => h.name).join(", ")}`
    : "No specific website context.";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [
          {
            role: "system",
            content: `You are CompassCrew, a friendly cybersecurity advisor. Answer the user's questions about website security. Be concise, use everyday language, and give actionable advice.\n\n${contextPrompt}`,
          },
          ...messages,
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

    const data = await response.json();
    const content = data.message?.content;
    if (content && content.length > 5) {
      return content;
    }
    throw new Error("Empty response");
  } catch (e: any) {
    if (e.name === "AbortError") {
      return "AI took too long to respond. The model might be loading — try again in a moment.";
    }
    return "AI is unavailable. Make sure Ollama is running:\n1. Install Ollama from ollama.ai\n2. Run: ollama pull llama3.2:3b\n3. Run: ollama serve\nThen reload the extension.";
  }
}
