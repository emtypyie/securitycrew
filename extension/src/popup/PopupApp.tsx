import { useState, useEffect, useCallback } from "react";
import type { SecurityReport, HistoryEntry } from "@shared/types";
import { ScoreGauge } from "../components/ScoreGauge";
import { HeaderList } from "../components/HeaderList";
import { DomainInfoCard } from "../components/DomainInfoCard";
import { AIChat } from "../components/AIChat";

type Tab = "overview" | "headers" | "domain" | "history" | "chat";

export default function PopupApp() {
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [modelPulling, setModelPulling] = useState(false);

  const checkOllama = useCallback(async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "CHECK_OLLAMA" });
      setOllamaAvailable(resp?.available ?? false);
    } catch {
      setOllamaAvailable(false);
    }
  }, []);

  const analyzeCurrentTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab.url.startsWith("http")) {
        setError("Navigate to a website to analyze its security.");
        setLoading(false);
        return;
      }

      // Show pulling status if AI is available but model might need downloading
      if (ollamaAvailable === false) {
        setModelPulling(false);
      }

      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_URL",
        url: tab.url,
        tabId: tab.id,
      });

      if (response) {
        setReport(response);
      } else {
        setError("Failed to analyze this page.");
      }
    } catch {
      setError("Extension error. Please try again.");
    }
    setLoading(false);
    setModelPulling(false);
  }, [ollamaAvailable]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
      setHistory(data || []);
    } catch {
      setHistory([]);
    }
  }, []);

  const refreshAI = useCallback(async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "REFRESH_AI",
        url: report.url,
      });
      if (resp) setReport(resp);
    } catch {}
    setAiLoading(false);
  }, [report]);

  useEffect(() => {
    checkOllama();
    analyzeCurrentTab();
    loadHistory();
  }, [analyzeCurrentTab, loadHistory, checkOllama]);

  const riskColor = (level: string) => {
    switch (level) {
      case "safe": return "text-green-500";
      case "moderate": return "text-yellow-500";
      case "suspicious": return "text-orange-500";
      case "dangerous": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const aiStatusBadge = () => {
    if (ollamaAvailable === null) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">
          Checking...
        </span>
      );
    }
    if (modelPulling) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-900 text-yellow-300 animate-pulse">
          Downloading AI model...
        </span>
      );
    }
    if (ollamaAvailable) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-900 text-green-300">
          AI Ready
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">
        No AI
      </span>
    );
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-lg">CompassCrew</span>
            {aiStatusBadge()}
          </div>
          <button
            onClick={analyzeCurrentTab}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            Re-scan
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">
            {modelPulling ? "Downloading AI model (first time only)..." : "Analyzing security posture..."}
          </p>
          {modelPulling && (
            <p className="text-gray-600 text-xs text-center px-8">
              llama3.2:3b is being downloaded via Ollama. This only happens once.
            </p>
          )}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
          <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-gray-400 text-sm text-center">{error}</p>
        </div>
      ) : report ? (
        <div>
          <nav className="flex border-b border-gray-800 bg-gray-900/50">
            {(["overview", "headers", "domain", "history", "chat"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="p-4">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1 truncate max-w-[300px] mx-auto">{report.url}</p>
                  <ScoreGauge score={report.score.total} grade={report.score.grade} />
                  <p className={`text-sm font-semibold mt-2 capitalize ${riskColor(report.score.riskLevel)}`}>
                    {report.score.riskLevel}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="HTTPS" value={report.https ? "Yes" : "No"} good={report.https} />
                  <StatCard label="TLS" value={report.tls.valid ? "Valid" : "Invalid"} good={report.tls.valid} />
                  <StatCard label="Headers" value={`${report.headers.filter((h) => h.present).length}/${report.headers.length}`} good={report.headers.filter((h) => h.present).length > 4} />
                  <StatCard label="Reputation" value={report.reputation.status} good={report.reputation.status === "safe"} />
                </div>

                {report.aiSummary && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-blue-400">
                        {ollamaAvailable ? "AI Analysis" : "Security Summary"}
                      </p>
                      <button
                        onClick={refreshAI}
                        disabled={aiLoading}
                        className="text-[10px] text-gray-500 hover:text-blue-400 disabled:text-gray-700 transition-colors"
                      >
                        {aiLoading ? "Generating..." : "Refresh"}
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{report.aiSummary}</p>
                    {!ollamaAvailable && (
                      <div className="mt-3 pt-2 border-t border-gray-800">
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          For AI-powered analysis, install Ollama:
                        </p>
                        <code className="text-[10px] text-blue-400 mt-1 block">
                          1. ollama.ai {"->"} install{"\n"}
                          2. ollama pull llama3.2:3b{"\n"}
                          3. ollama serve
                        </code>
                        <p className="text-[10px] text-gray-600 mt-1">
                          The model auto-downloads on first use.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {report.score.breakdown && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Score Breakdown</p>
                    <div className="space-y-1.5">
                      {[
                        { label: "HTTPS", score: report.score.breakdown.https },
                        { label: "TLS/SSL", score: report.score.breakdown.tls },
                        { label: "Security Headers", score: report.score.breakdown.headers },
                        { label: "Reputation", score: report.score.breakdown.reputation },
                        { label: "Domain Age", score: report.score.breakdown.domainAge },
                        { label: "Phishing Checks", score: report.score.breakdown.phishing },
                        { label: "Form Safety", score: report.score.breakdown.formSafety },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400 w-28 shrink-0">{item.label}</span>
                          <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.score >= 80 ? "bg-green-500" :
                                item.score >= 50 ? "bg-yellow-500" :
                                item.score >= 25 ? "bg-orange-500" : "bg-red-500"
                              }`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-gray-500 w-6 text-right">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "headers" && <HeaderList headers={report.headers} />}
            {activeTab === "domain" && <DomainInfoCard domain={report.domain} reputation={report.reputation} tls={report.tls} />}
            {activeTab === "history" && <HistoryList history={history} />}
            {activeTab === "chat" && <AIChat report={report} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${good ? "text-green-400" : "text-red-400"}`}>{value}</p>
    </div>
  );
}

function HistoryList({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No history yet.</p>;
  }

  return (
    <div className="space-y-2">
      {history.map((entry, i) => (
        <div key={`${entry.url}-${i}`} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300 truncate flex-1 mr-2">{entry.url}</p>
            <span className={`text-sm font-bold ${
              entry.riskLevel === "safe" ? "text-green-400" :
              entry.riskLevel === "moderate" ? "text-yellow-400" :
              entry.riskLevel === "suspicious" ? "text-orange-400" :
              "text-red-400"
            }`}>
              {entry.score}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
