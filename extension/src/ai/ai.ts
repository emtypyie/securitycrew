import type { SecurityReport, ChatMessage, ExtensionSettings } from "@shared/types";

let currentSettings: ExtensionSettings | null = null;
let serverAvailable: boolean | null = null;

export function configureAI(settings: ExtensionSettings): void {
  const changed =
    !currentSettings ||
    settings.aiProvider !== currentSettings.aiProvider ||
    settings.aiServerUrl !== currentSettings.aiServerUrl ||
    settings.aiModel !== currentSettings.aiModel ||
    settings.aiApiKey !== currentSettings.aiApiKey;

  if (changed) {
    currentSettings = settings;
    serverAvailable = null;
  }
}

export function resetAICache(): void {
  serverAvailable = null;
}

function getSettings(): ExtensionSettings {
  return currentSettings || {
    enableNotifications: true,
    enableFormGuard: true,
    educationalMode: false,
    backendUrl: "",
    aiProvider: "llamacpp",
    aiServerUrl: "http://localhost:8080",
    aiModel: "local-model",
    aiApiKey: "",
  };
}

// --- Provider-specific availability checks ---

async function checkLlamaCpp(): Promise<boolean> {
  const url = getSettings().aiServerUrl;
  try {
    const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return resp.ok;
  } catch {
    return false;
  }
}

async function checkGemini(): Promise<boolean> {
  const key = getSettings().aiApiKey;
  return key.length > 10;
}

async function checkOpenAI(): Promise<boolean> {
  const key = getSettings().aiApiKey;
  return key.length > 10;
}

export async function isServerAvailable(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable;

  const s = getSettings();
  switch (s.aiProvider) {
    case "llamacpp":
      serverAvailable = await checkLlamaCpp();
      break;
    case "gemini":
      serverAvailable = await checkGemini();
      break;
    case "openai":
      serverAvailable = await checkOpenAI();
      break;
    default:
      serverAvailable = false;
  }
  return serverAvailable;
}

// --- Chat completion per provider ---

async function chatLlamaCpp(messages: { role: string; content: string }[]): Promise<string | null> {
  const s = getSettings();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(`${s.aiServerUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: s.aiModel, messages, temperature: 0.4, max_tokens: 512 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    return content && content.length > 10 ? content : null;
  } catch {
    return null;
  }
}

async function chatGemini(messages: { role: string; content: string }[]): Promise<string | null> {
  const s = getSettings();
  const model = s.aiModel || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${s.aiApiKey}`;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemMsg = messages.find((m) => m.role === "system");

  const body: Record<string, unknown> = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }
  body.generationConfig = { temperature: 0.4, maxOutputTokens: 512 };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text && text.length > 10 ? text : null;
  } catch {
    return null;
  }
}

async function chatOpenAI(messages: { role: string; content: string }[]): Promise<string | null> {
  const s = getSettings();
  const baseUrl = s.aiServerUrl || "https://api.openai.com/v1";
  const model = s.aiModel || "gpt-4o-mini";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${s.aiApiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 512 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    return content && content.length > 10 ? content : null;
  } catch {
    return null;
  }
}

async function chatCompletion(messages: { role: string; content: string }[]): Promise<string | null> {
  const s = getSettings();
  switch (s.aiProvider) {
    case "llamacpp": return chatLlamaCpp(messages);
    case "gemini": return chatGemini(messages);
    case "openai": return chatOpenAI(messages);
    default: return null;
  }
}

// --- Report text generation (unchanged) ---

export function generateReportText(report: SecurityReport): string {
  const lines: string[] = [];

  lines.push("SECURITY AUDIT REPORT - SecurityCrew");
  lines.push("=".repeat(50));
  lines.push("");
  lines.push(`TARGET: ${report.url}`);
  lines.push(`DOMAIN: ${report.domain.domain}`);
  lines.push(`DATE: ${new Date(report.timestamp).toISOString()}`);
  lines.push("");
  lines.push(`SCORE: ${report.score.total}/100 (Grade: ${report.score.grade}, Risk: ${report.score.riskLevel})`);
  lines.push("");
  lines.push("Score Breakdown:");
  lines.push(`  HTTPS:            ${report.score.breakdown.https}/100`);
  lines.push(`  TLS/SSL:          ${report.score.breakdown.tls}/100`);
  lines.push(`  Security Headers: ${report.score.breakdown.headers}/100`);
  lines.push(`  Reputation:       ${report.score.breakdown.reputation}/100`);
  lines.push(`  Domain Age:       ${report.score.breakdown.domainAge}/100`);
  lines.push(`  Phishing Checks:  ${report.score.breakdown.phishing}/100`);
  lines.push(`  Form Safety:      ${report.score.breakdown.formSafety}/100`);
  lines.push("");
  lines.push("HTTPS & TLS:");
  lines.push(`  HTTPS: ${report.https ? "YES" : "NO"}`);
  lines.push(`  Certificate: ${report.tls.valid ? "Valid" : "INVALID"}`);
  if (report.tls.issuer) lines.push(`  Issuer: ${report.tls.issuer}`);
  if (report.tls.protocol) lines.push(`  Protocol: ${report.tls.protocol}`);
  if (report.tls.selfSigned) lines.push("  WARNING: Self-signed certificate");
  if (report.tls.weakCipher) lines.push("  WARNING: Weak encryption");
  lines.push("");
  lines.push(`Security Headers (${report.headers.filter((h) => h.present).length}/${report.headers.length} present):`);
  for (const h of report.headers) {
    const tag = h.present ? "OK" : "MISSING";
    lines.push(`  [${tag}] ${h.name} (${h.severity})`);
    if (h.present && h.value) lines.push(`    Value: ${h.value}`);
    if (!h.present) lines.push(`    Risk: ${h.description}`);
  }
  lines.push("");
  lines.push("Domain Analysis:");
  lines.push(`  Domain: ${report.domain.domain}`);
  if (report.domain.ageDays !== undefined) lines.push(`  Age: ${report.domain.ageDays} days`);
  const signals = [
    report.domain.suspiciousTLD && "Suspicious TLD",
    report.domain.typosquatting && "Typosquatting",
    report.domain.homographAttack && "Homograph Attack",
    report.domain.ipBasedURL && "IP-based URL",
    report.domain.excessiveSubdomains && "Excessive Subdomains",
  ].filter(Boolean);
  lines.push(`  Phishing Signals: ${signals.length > 0 ? signals.join(", ") : "None"}`);
  lines.push("");
  lines.push(`Reputation: ${report.reputation.status}`);
  for (const src of report.reputation.sources) {
    lines.push(`  ${src.name}: ${src.status}`);
  }
  lines.push("");
  lines.push(`Forms: ${report.forms.hasPasswordFields ? "Password fields" : "None"}${report.forms.isHTTP ? " (UNENCRYPTED)" : ""}`);
  if (report.forms.warning) lines.push(`  WARNING: ${report.forms.warning}`);
  lines.push("");
  lines.push("END OF REPORT");

  return lines.join("\n");
}

// --- Generate summary ---

export async function generateSummary(report: SecurityReport): Promise<string> {
  const reportText = generateReportText(report);
  await chrome.storage.local.set({ [`reportText_${report.url}`]: reportText });

  const available = await isServerAvailable();
  if (available) {
    const summary = await chatCompletion([
      {
        role: "system",
        content: `You are SecurityCrew, an expert cybersecurity advisor. You receive a detailed security audit report for a website. Summarize it for a non-technical user.

RULES:
1. Start with a one-line verdict: Safe / Use Caution / Dangerous
2. List the top 3-5 findings in simple language
3. Explain what missing headers mean in plain terms
4. Note any phishing or domain red flags
5. End with a clear recommendation
6. Max 120 words
7. Never use jargon without explaining it`,
      },
      {
        role: "user",
        content: `Summarize this security report:\n\n${reportText}`,
      },
    ]);

    if (summary) return summary;
  }

  return generateFallbackSummary(report);
}

// --- Chat with AI ---

export async function chatWithAI(
  messages: ChatMessage[],
  reportContext?: SecurityReport
): Promise<string> {
  const available = await isServerAvailable();
  const s = getSettings();

  if (!available) {
    switch (s.aiProvider) {
      case "llamacpp":
        return "llama.cpp server is not running.\n\nRun this in a terminal:\nllama-server -m model.gguf --port 8080\n\nThe extension will connect automatically.";
      case "gemini":
        return "Gemini API key is not configured.\n\nTo set up:\n1. Go to aistudio.google.com\n2. Create an API key\n3. Paste it in SecurityCrew settings";
      case "openai":
        return "OpenAI API key is not configured.\n\nTo set up:\n1. Go to platform.openai.com\n2. Create an API key\n3. Paste it in SecurityCrew settings";
      default:
        return "AI is not configured. Open SecurityCrew settings to set up an AI provider.";
    }
  }

  let reportText = "";
  if (reportContext) {
    const stored = await chrome.storage.local.get(`reportText_${reportContext.url}`);
    reportText = stored[`reportText_${reportContext.url}`] || generateReportText(reportContext);
  }

  const systemPrompt = reportContext
    ? `You are SecurityCrew, a cybersecurity advisor. You have a full security audit report for ${reportContext.domain.domain} (Score: ${reportContext.score.total}/100, Grade: ${reportContext.score.grade}).

REPORT:
${reportText}

Answer questions about this website's security. Reference specific findings from the report. Use everyday language.`
    : `You are SecurityCrew, a cybersecurity advisor. Answer questions about website security. Be concise and practical.`;

  const reply = await chatCompletion([
    { role: "system", content: systemPrompt },
    ...messages,
  ]);

  return reply || "AI could not generate a response. Check your API configuration.";
}

// --- Fallback when no AI ---

function generateFallbackSummary(report: SecurityReport): string {
  const score = report.score.total;
  const parts: string[] = [];

  if (score >= 85) parts.push(`VERDICT: This site looks safe. Score: ${score}/100 (Grade: ${report.score.grade}).`);
  else if (score >= 60) parts.push(`VERDICT: Use caution on this site. Score: ${score}/100 (Grade: ${report.score.grade}).`);
  else if (score >= 30) parts.push(`VERDICT: Serious security issues found. Score: ${score}/100 (Grade: ${report.score.grade}).`);
  else parts.push(`VERDICT: DANGEROUS — avoid this site. Score: ${score}/100 (Grade: ${report.score.grade}).`);

  if (!report.https) parts.push("No HTTPS — your data is sent in plain text and can be intercepted.");

  if (report.tls.selfSigned) parts.push("Self-signed certificate — the site's identity cannot be verified.");
  if (report.tls.weakCipher) parts.push("Uses outdated encryption.");

  const missingHigh = report.headers.filter((h) => !h.present && (h.severity === "high" || h.severity === "critical"));
  if (missingHigh.length > 0) parts.push(`Missing critical headers: ${missingHigh.map((h) => h.name).join(", ")}. This leaves the site vulnerable to attacks.`);

  if (report.domain.homographAttack) parts.push("RED FLAG: Domain mimics a real brand name — likely phishing.");
  if (report.domain.typosquatting) parts.push("RED FLAG: Domain looks like a misspelling of a known site.");
  if (report.domain.suspiciousTLD) parts.push("Uses a TLD commonly seen on scam sites.");
  if (report.domain.ageDays !== undefined && report.domain.ageDays < 30) parts.push(`Domain is only ${report.domain.ageDays} days old.`);

  if (report.reputation.status === "malicious") parts.push("Flagged as MALICIOUS. Do NOT enter personal information.");
  else if (report.reputation.status === "suspicious") parts.push("Flagged as suspicious by security sources.");

  parts.push(score >= 60 ? "Browse with caution. Avoid entering sensitive info." : "Do NOT enter personal or payment information.");

  return parts.join("\n\n");
}
