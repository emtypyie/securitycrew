import type { SecurityReport, ExtensionSettings, FormAnalysis } from "@shared/types";
import { analyzeHeaders } from "../services/header-analyzer";
import { analyzeTLS } from "../services/tls-analyzer";
import { analyzeDomain, getDomainAge } from "../services/domain-analyzer";
import { checkReputation } from "../services/reputation-checker";
import { calculateScore } from "@shared/scoring/engine";
import { generateSummary, chatWithAI, isServerAvailable, resetAICache, configureAI } from "../ai/ollama";

const DEFAULT_SETTINGS: ExtensionSettings = {
  enableNotifications: true,
  enableFormGuard: true,
  educationalMode: false,
  backendUrl: "",
  aiProvider: "llamacpp",
  aiServerUrl: "http://localhost:8080",
  aiModel: "local-model",
  aiApiKey: "",
};

const EMPTY_FORMS: FormAnalysis = {
  hasPasswordFields: false,
  hasCreditCardFields: false,
  hasLoginForm: false,
  isHTTP: false,
  formCount: 0,
  warning: null,
};

async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...stored.settings };
}

// --- Form data from content scripts (per-tab) ---
const formDataByTab = new Map<number, FormAnalysis>();

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

// --- Fetch headers directly ---
async function fetchHeaders(url: string): Promise<Record<string, string>> {
  const cached = headerCache.get(url);
  if (cached && Object.keys(cached).length > 0) return cached;

  try {
    const resp = await fetch(url, { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(5000) });
    const headers: Record<string, string> = {};
    resp.headers.forEach((value, key) => { headers[key] = value; });
    if (Object.keys(headers).length > 0) return headers;
  } catch {}

  try {
    const resp = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
    const headers: Record<string, string> = {};
    resp.headers.forEach((value, key) => { headers[key] = value; });
    return headers;
  } catch {
    return {};
  }
}

// --- Main analysis ---
async function analyzeTab(tabId: number, url: string): Promise<SecurityReport> {
  const settings = await getSettings();
  configureAI(settings);

  const responseHeaders = await fetchHeaders(url);

  const [tls, domainInfo, reputation] = await Promise.all([
    analyzeTLS(url, settings.backendUrl || undefined),
    analyzeDomain(url),
    checkReputation(url, settings.backendUrl || undefined),
  ]);

  const domainAge = await getDomainAge(domainInfo.domain, settings.backendUrl || undefined);
  const headers = analyzeHeaders(responseHeaders);
  const forms = formDataByTab.get(tabId) || EMPTY_FORMS;

  const isHTTP = !url.startsWith("https://");
  const formsWithHTTP = { ...forms, isHTTP };

  const score = calculateScore(
    url.startsWith("https://"),
    headers, tls,
    { ...domainInfo, ...domainAge },
    reputation,
    formsWithHTTP,
  );

  const report: SecurityReport = {
    url, timestamp: Date.now(),
    https: url.startsWith("https://"),
    headers, tls,
    domain: { ...domainInfo, ...domainAge },
    reputation,
    forms: formsWithHTTP,
    score,
  };

  report.aiSummary = await generateSummary(report);
  await chrome.storage.local.set({ [`report_${url}`]: report });

  const historyEntry = { url, score: score.total, riskLevel: score.riskLevel, timestamp: Date.now() };
  const { history = [] } = await chrome.storage.local.get("history");
  const updated = [historyEntry, ...history.filter((h: { url: string }) => h.url !== url)].slice(0, 100);
  await chrome.storage.local.set({ history: updated });

  if (settings.enableNotifications && score.riskLevel === "dangerous") {
    chrome.notifications.create(`warning-${tabId}`, {
      type: "basic", iconUrl: "icons/icon128.png",
      title: "SecurityCrew: Dangerous Site Detected",
      message: `${new URL(url).hostname} scored ${score.total}/100.`,
    });
  }

  return report;
}

// --- Message handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_URL") {
    analyzeTab(message.tabId || 0, message.url).then((report) => sendResponse(report));
    return true;
  }

  if (message.type === "REFRESH_AI") {
    chrome.storage.local.get(`report_${message.url}`).then(async (data) => {
      const report = data[`report_${message.url}`];
      if (report) {
        report.aiSummary = await generateSummary(report);
        await chrome.storage.local.set({ [`report_${message.url}`]: report });
        sendResponse(report);
      } else {
        sendResponse(null);
      }
    });
    return true;
  }

  if (message.type === "CHECK_AI_SERVER") {
    getSettings().then((settings) => {
      configureAI(settings);
      isServerAvailable().then((available) => sendResponse({ available }));
    });
    return true;
  }

  if (message.type === "FORM_DATA") {
    if (sender.tab?.id && message.forms) {
      formDataByTab.set(sender.tab.id, message.forms);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "GET_HISTORY") {
    chrome.storage.local.get("history").then((data) => sendResponse(data.history || []));
    return true;
  }

  if (message.type === "CHAT_AI") {
    chatWithAI(message.messages, message.report).then((reply) => sendResponse({ reply }));
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    getSettings().then((settings) => sendResponse(settings));
    return true;
  }

  if (message.type === "SAVE_SETTINGS") {
    const s = message.settings as ExtensionSettings;
    configureAI(s);
    resetAICache();
    chrome.storage.local.set({ settings: message.settings }).then(() => sendResponse({ success: true }));
    return true;
  }
});

// --- Auto-analyze on tab changes ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.startsWith("http")) {
      analyzeTab(activeInfo.tabId, tab.url);
    }
  } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && changeInfo.url.startsWith("http")) {
    analyzeTab(tabId, changeInfo.url);
  }
});

// Clean up form data when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  formDataByTab.delete(tabId);
});

// --- Startup: check AI provider ---
(async () => {
  const settings = await getSettings();
  configureAI(settings);
  const available = await isServerAvailable();
  if (available) {
    console.log(`SecurityCrew: AI provider "${settings.aiProvider}" is configured`);
  } else {
    console.log("SecurityCrew: No AI configured. Open settings to set up.");
  }
})();

console.log("SecurityCrew background service worker loaded.");
