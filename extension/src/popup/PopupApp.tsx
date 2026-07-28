import { useState, useEffect, useRef } from "react";
import type { SecurityReport, HistoryEntry } from "@shared/types";
import { ScoreGauge } from "../components/ScoreGauge";
import { HeaderList } from "../components/HeaderList";
import { DomainInfoCard } from "../components/DomainInfoCard";
import { AIChat } from "../components/AIChat";

type Tab = "score" | "details" | "chat";

export default function PopupApp() {
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("score");
  const [error, setError] = useState<string | null>(null);
  const [aiServer, setAiServer] = useState<boolean | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "CHECK_AI_SERVER" }).then((resp) => {
      if (mountedRef.current) setAiServer(resp?.available ?? false);
    }).catch(() => {
      if (mountedRef.current) setAiServer(false);
    });
    return () => { mountedRef.current = false; };
  }, []);

  const analyzeTab = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab.url.startsWith("http")) {
        setError("Navigate to a website to check its security.");
        setLoading(false);
        return;
      }
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_URL",
        url: tab.url,
        tabId: tab.id,
      });
      if (response) {
        setReport(response);
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_HISTORY" }).then((data) => {
      setHistory(data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    analyzeTab();
  }, []);

  const refreshAI = async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      const resp = await chrome.runtime.sendMessage({ type: "REFRESH_AI", url: report.url });
      if (resp) setReport(resp);
    } catch {}
    setAiLoading(false);
  };

  const riskColor = (level: string) => {
    switch (level) {
      case "safe": return "text-green-400";
      case "moderate": return "text-yellow-400";
      case "suspicious": return "text-orange-400";
      case "dangerous": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const riskIcon = (level: string) => {
    switch (level) {
      case "safe":
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "moderate":
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case "suspicious":
        return (
          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case "dangerous":
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-950 text-white w-[380px] min-h-[500px]">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-lg">SecurityCrew</span>
            {aiServer !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${aiServer ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                {aiServer ? "AI" : "No AI"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={analyzeTab}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-medium transition-colors"
            >
              Scan
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Scanning...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm text-center">{error}</p>
          <button onClick={analyzeTab} className="text-xs text-blue-400 hover:text-blue-300">Try again</button>
        </div>
      ) : report ? (
        <div>
          <nav className="flex border-b border-gray-800">
            {(["score", "details", "chat"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "score" ? "Score" : tab === "details" ? "Details" : "Ask AI"}
              </button>
            ))}
          </nav>

          <div className="p-4">
            {activeTab === "score" && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-[11px] text-gray-500 mb-2 truncate max-w-[320px] mx-auto">{report.url}</p>
                  <ScoreGauge score={report.score.total} grade={report.score.grade} />
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {riskIcon(report.score.riskLevel)}
                    <p className={`text-sm font-semibold capitalize ${riskColor(report.score.riskLevel)}`}>
                      {report.score.riskLevel === "safe" ? "Looks Safe" :
                       report.score.riskLevel === "moderate" ? "Use Caution" :
                       report.score.riskLevel === "suspicious" ? "Suspicious" :
                       "Dangerous"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="HTTPS" value={report.https ? "Yes" : "No"} good={report.https} />
                  <StatCard label="Certificate" value={report.tls.valid ? "Valid" : "Invalid"} good={report.tls.valid} />
                  <StatCard label="Headers" value={`${report.headers.filter((h) => h.present).length}/${report.headers.length}`} good={report.headers.filter((h) => h.present).length > 4} />
                  <StatCard label="Reputation" value={report.reputation.status} good={report.reputation.status === "safe"} />
                </div>

                {report.aiSummary && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-blue-400">
                        {aiServer ? "AI Summary" : "Summary"}
                      </p>
                      <button
                        onClick={refreshAI}
                        disabled={aiLoading}
                        className="text-[10px] text-gray-500 hover:text-blue-400 disabled:text-gray-700 transition-colors"
                      >
                        {aiLoading ? "..." : "Refresh"}
                      </button>
                    </div>
                    <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-line">{report.aiSummary}</p>
                  </div>
                )}

                {report.score.breakdown && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Breakdown</p>
                    <div className="space-y-1.5">
                      {[
                        { label: "HTTPS", score: report.score.breakdown.https },
                        { label: "TLS/SSL", score: report.score.breakdown.tls },
                        { label: "Headers", score: report.score.breakdown.headers },
                        { label: "Reputation", score: report.score.breakdown.reputation },
                        { label: "Phishing", score: report.score.breakdown.phishing },
                        { label: "Forms", score: report.score.breakdown.formSafety },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400 w-20 shrink-0">{item.label}</span>
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
                          <span className="text-[11px] text-gray-500 w-5 text-right">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-4">
                <HeaderList headers={report.headers} />
                <DomainInfoCard domain={report.domain} reputation={report.reputation} tls={report.tls} />
                {history.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">Recent Scans</p>
                    <div className="space-y-1.5">
                      {history.slice(0, 10).map((entry, i) => (
                        <div key={`${entry.url}-${i}`} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-gray-400 truncate flex-1 mr-2">{new URL(entry.url).hostname}</p>
                          <span className={`text-xs font-bold ${
                            entry.riskLevel === "safe" ? "text-green-400" :
                            entry.riskLevel === "moderate" ? "text-yellow-400" :
                            entry.riskLevel === "suspicious" ? "text-orange-400" :
                            "text-red-400"
                          }`}>
                            {entry.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "chat" && <AIChat report={report} aiServer={aiServer} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${good ? "text-green-400" : "text-red-400"}`}>{value}</p>
    </div>
  );
}
