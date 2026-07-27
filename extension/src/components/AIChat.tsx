import { useState } from "react";
import type { SecurityReport, ChatMessage } from "@shared/types";

interface AIChatProps {
  report: SecurityReport;
}

export function AIChat({ report }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const siteName = report.domain.domain;
  const score = report.score.total;
  const missingHeaders = report.headers.filter((h) => !h.present).map((h) => h.name);

  const QUICK_QUESTIONS = [
    "Is this site safe to use?",
    score < 70 ? "Why is my score so low?" : "What makes this site score well?",
    missingHeaders.length > 0 ? `What does ${missingHeaders[0]} do?` : "What headers are configured?",
    "Should I enter my password here?",
    "Is my data safe on this site?",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CHAT_AI",
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        report,
      });

      const aiMsg: ChatMessage = { role: "assistant", content: response.reply || "No response." };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "AI is unavailable. Make sure Ollama is running (ollama serve)." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[400px]">
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center gap-3 px-4">
          <div className="mt-4 text-center">
            <svg className="w-10 h-10 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.105V4.875A1.875 1.875 0 015.625 3h12.75A1.875 1.875 0 0120.25 4.875v10.5A1.875 1.875 0 0118.375 17.25H7.5l-3.75 2.855z" />
            </svg>
            <p className="text-sm text-gray-400">Chat with AI about {siteName}</p>
            <p className="text-[10px] text-gray-600 mt-1">
              AI has the full security report for this site
            </p>
          </div>

          <div className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-[11px] text-gray-500">
            <span className="text-gray-400">Context:</span> Score {score}/100, Grade {report.score.grade}
            {missingHeaders.length > 0 && <>, {missingHeaders.length} headers missing</>}
            {report.domain.suspiciousTLD && <>, suspicious TLD</>}
            {report.reputation.status !== "safe" && <>, reputation: {report.reputation.status}</>}
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 text-[10px] text-gray-500 text-center">
            AI has full report context for {siteName} (Score: {score}/100)
          </div>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder={`Ask about ${siteName}...`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
