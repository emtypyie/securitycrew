import type { SecurityReport, ExtensionSettings } from "@shared/types";
import { analyzeHeaders } from "../services/header-analyzer";
import { analyzeTLS } from "../services/tls-analyzer";
import { analyzeDomain, getDomainAge } from "../services/domain-analyzer";
import { checkReputation } from "../services/reputation-checker";
import { calculateScore } from "@shared/scoring/engine";
import { generateSummary } from "../ai/ollama";

const DEFAULT_SETTINGS: ExtensionSettings = {
  enableNotifications: true,
  enableFormGuard: true,
  educationalMode: false,
  backendUrl: "",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2:3b",
};

async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...stored.settings };
}

// --- Header collection via webRequest (best-effort cache) ---
const headerCache = new Map<string, Record<string, string>>();

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId === -1) return;
    const headers: Record<string, string> = {};
    if (details.responseHeaders) {
      for (const h of details.responseHeaders) {
        if (h.name && h.value) {
          headers[h.name] = h.value;
        }
      }
    }
    headerCache.set(details.url, headers);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// --- Fetch headers directly via HEAD request (primary method) ---
async function fetchHeaders(url: string): Promise<Record<string, string>> {
  // First try the webRequest cache
  const cached = headerCache.get(url);
  if (cached && Object.keys(cached).length > 0) {
    return cached;
  }

  // Try HEAD request to get headers
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      signal: AbortSignal.timeout(5000),
    });
    const headers: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      headers[key] = value;
    });
    if (Object.keys(headers).length > 0) {
      return headers;
    }
  } catch {
    // no-op
  }

  // Try GET request as fallback (won't get cross-origin headers though)
  try {
    const resp = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    const headers: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  } catch {
    return {};
  }
}

// --- Main analysis ---
async function analyzeTab(tabId: number, url: string): Promise<SecurityReport> {
  const settings = await getSettings();

  // Fetch headers directly instead of relying on cache
  const responseHeaders = await fetchHeaders(url);

  const [tls, domainInfo, reputation] = await Promise.all([
    analyzeTLS(url, settings.backendUrl || undefined),
    analyzeDomain(url),
    checkReputation(url, settings.backendUrl || undefined),
  ]);

  const domainAge = await getDomainAge(domainInfo.domain, settings.backendUrl || undefined);

  const headers = analyzeHeaders(responseHeaders);

  const score = calculateScore(
    url.startsWith("https://"),
    headers,
    tls,
    { ...domainInfo, ...domainAge },
    reputation,
    { hasPasswordFields: false, hasCreditCardFields: false, hasLoginForm: false, isHTTP: !url.startsWith("https://"), formCount: 0, warning: null }
  );

  const report: SecurityReport = {
    url,
    timestamp: Date.now(),
    https: url.startsWith("https://"),
    headers,
    tls,
    domain: { ...domainInfo, ...domainAge },
    reputation,
    forms: { hasPasswordFields: false, hasCreditCardFields: false, hasLoginForm: false, isHTTP: !url.startsWith("https://"), formCount: 0, warning: null },
    score,
  };

  try {
    report.aiSummary = await generateSummary(report);
  } catch {
    report.aiSummary = undefined;
  }

  await chrome.storage.local.set({ [`report_${url}`]: report });

  const historyEntry = {
    url,
    score: score.total,
    riskLevel: score.riskLevel,
    timestamp: Date.now(),
  };

  const { history = [] } = await chrome.storage.local.get("history");
  const updated = [historyEntry, ...history.filter((h: { url: string }) => h.url !== url)].slice(0, 100);
  await chrome.storage.local.set({ history: updated });

  if (settings.enableNotifications && score.riskLevel === "dangerous") {
    chrome.notifications.create(`warning-${tabId}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "CompassCrew: Dangerous Site Detected",
      message: `${new URL(url).hostname} has a security score of ${score.total}/100. This site may be unsafe.`,
    });
  }

  return report;
}

// --- Message handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_URL") {
    analyzeTab(message.tabId || 0, message.url).then((report) => {
      sendResponse(report);
    });
    return true;
  }

  if (message.type === "GET_REPORT") {
    chrome.storage.local.get(`report_${message.url}`).then((data) => {
      sendResponse(data[`report_${message.url}`] || null);
    });
    return true;
  }

  if (message.type === "GET_HISTORY") {
    chrome.storage.local.get("history").then((data) => {
      sendResponse(data.history || []);
    });
    return true;
  }

  if (message.type === "CHAT_AI") {
    chatWithAIWrapper(message.messages, message.report).then((reply) => {
      sendResponse({ reply });
    });
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    getSettings().then((settings) => {
      sendResponse(settings);
    });
    return true;
  }

  if (message.type === "SAVE_SETTINGS") {
    chrome.storage.local.set({ settings: message.settings }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

async function chatWithAIWrapper(
  messages: { role: string; content: string }[],
  report?: SecurityReport
): Promise<string> {
  const settings = await getSettings();

  try {
    const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [
          {
            role: "system",
            content: `You are a friendly cybersecurity advisor. Keep answers concise and non-technical. ${
              report
                ? `Current site: ${report.url} | Score: ${report.score.total}/100 | Grade: ${report.score.grade}`
                : ""
            }`,
          },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama failed");
    const data = await response.json();
    return data.message?.content || "No response from AI.";
  } catch {
    return "AI unavailable. Make sure Ollama is running with llama3.2:3b loaded.";
  }
}

// --- Auto-analyze on tab changes ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url && tab.url.startsWith("http")) {
    analyzeTab(activeInfo.tabId, tab.url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && changeInfo.url.startsWith("http")) {
    analyzeTab(tabId, changeInfo.url);
  }
});

console.log("CompassCrew background service worker loaded.");
