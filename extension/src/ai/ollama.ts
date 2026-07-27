import type { SecurityReport, AIExplanation, ChatMessage } from "@shared/types";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2:3b";

function getSettings(): { ollamaUrl: string; ollamaModel: string } {
  return {
    ollamaUrl: DEFAULT_OLLAMA_URL,
    ollamaModel: DEFAULT_MODEL,
  };
}

function buildReportPrompt(report: SecurityReport): string {
  return `You are a friendly security advisor. Summarize this website security report for a non-technical user. Be concise and actionable.

Website: ${report.url}
Security Score: ${report.score.total}/100 (Grade: ${report.score.grade})
HTTPS: ${report.https ? "Yes" : "No"}

Security Headers:
${report.headers.map((h) => `- ${h.name}: ${h.present ? "Present (" + h.value + ")" : "MISSING"}`).join("\n")}

TLS Certificate: ${report.tls.valid ? "Valid" : "Invalid"}${report.tls.issuer ? ` (Issuer: ${report.tls.issuer})` : ""}${report.tls.daysUntilExpiry ? ` (Expires in ${report.tls.daysUntilExpiry} days)` : ""}

Domain: ${report.domain.domain}
${report.domain.ageDays ? `Domain Age: ${report.domain.ageDays} days` : ""}
${report.domain.suspiciousTLD ? "WARNING: Suspicious TLD detected" : ""}
${report.domain.typosquatting ? "WARNING: Possible typosquatting detected" : ""}
${report.domain.homographAttack ? "WARNING: Homograph attack detected" : ""}

Reputation: ${report.reputation.status}
${report.reputation.sources.map((s) => `  - ${s.name}: ${s.status}`).join("\n")}

Form Analysis: ${report.forms.hasPasswordFields ? "Password fields detected" : "No password fields"}${report.forms.isHTTP ? " (UNENCRYPTED HTTP)" : ""}

Explain the risks in simple terms and give actionable recommendations. Keep it under 150 words.`;
}

export async function generateSummary(
  report: SecurityReport
): Promise<string> {
  const settings = getSettings();
  const prompt = buildReportPrompt(report);

  try {
    const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [
          {
            role: "system",
            content:
              "You are a friendly cybersecurity advisor who explains security concepts in simple, everyday language. Be concise and helpful.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama request failed");

    const data = await response.json();
    return data.message?.content || "Unable to generate summary.";
  } catch {
    return generateFallbackSummary(report);
  }
}

function generateFallbackSummary(report: SecurityReport): string {
  const issues: string[] = [];

  if (!report.https) {
    issues.push("This site does NOT use HTTPS — any data you send is unencrypted.");
  }
  if (report.tls.selfSigned) {
    issues.push("The SSL certificate is self-signed, which may indicate a security risk.");
  }
  if (report.tls.weakCipher) {
    issues.push("The site uses weak encryption that could be compromised.");
  }

  const missingHeaders = report.headers.filter((h) => !h.present && (h.severity === "high" || h.severity === "critical"));
  if (missingHeaders.length > 0) {
    issues.push(`Missing important security headers: ${missingHeaders.map((h) => h.name).join(", ")}.`);
  }

  if (report.domain.suspiciousTLD) {
    issues.push("This domain uses a suspicious top-level domain often associated with scam sites.");
  }
  if (report.domain.typosquatting) {
    issues.push("This domain name closely resembles a well-known brand — it may be a phishing attempt.");
  }
  if (report.domain.homographAttack) {
    issues.push("This domain uses special characters that mimic real brand names (homograph attack).");
  }

  if (report.reputation.status === "malicious") {
    issues.push("This site is flagged as MALICIOUS by security databases. Do NOT enter personal information.");
  } else if (report.reputation.status === "suspicious") {
    issues.push("This site has been flagged as suspicious by some security sources.");
  }

  if (report.forms.isHTTP && (report.forms.hasPasswordFields || report.forms.hasCreditCardFields)) {
    issues.push("You are about to enter sensitive data over an UNENCRYPTED connection!");
  }

  if (issues.length === 0) {
    return `This site appears relatively safe (Score: ${report.score.total}/100). It uses HTTPS and has basic security headers in place. Normal browsing is fine, but always be cautious when entering sensitive information online.`;
  }

  return `⚠️ Security Score: ${report.score.total}/100 (${report.score.grade})\n\n${issues.join("\n\n")}\n\nRecommendation: ${report.score.total >= 60 ? "Browse with caution. Avoid entering sensitive information." : "This site has significant security issues. Avoid entering any personal or payment information."}`;
}

export async function chatWithAI(
  messages: ChatMessage[],
  reportContext?: SecurityReport
): Promise<string> {
  const settings = getSettings();

  const systemMessage: ChatMessage = {
    role: "user",
    content: `You are a friendly cybersecurity advisor. A user is asking about website security. ${
      reportContext
        ? `Current site: ${reportContext.url}\nSecurity Score: ${reportContext.score.total}/100\nGrade: ${reportContext.score.grade}\nRisk Level: ${reportContext.score.riskLevel}`
        : ""
    } Answer in simple terms. Be concise.`,
  };

  try {
    const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [systemMessage, ...messages],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama request failed");

    const data = await response.json();
    return data.message?.content || "Unable to generate response.";
  } catch {
    return "AI is currently unavailable. Make sure Ollama is running locally with the llama3.2:3b model loaded.";
  }
}
