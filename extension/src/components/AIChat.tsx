import { useState } from "react";
import type { SecurityReport, ChatMessage } from "@shared/types";

interface AIChatProps {
  report: SecurityReport;
  aiServer: boolean | null;
}

export function AIChat({ report, aiServer }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const siteName = report.domain.domain;
  const score = report.score.total;

  const QUICK_QUESTIONS = [
    "Is this site safe?",
    "What's wrong with this site?",
    "Should I enter my password here?",
    "How can I stay safe on this site?",
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
        { role: "assistant", content: "AI is not available. Check your settings." },
      ]);
    }
    setLoading(false);
  };

  if (!aiServer) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-6 text-center">
        <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-300">AI Chat</p>
          <p className="text-xs text-gray-500 mt-1">Ask questions about this site's security</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs text-gray-400 w-full">
          <p className="font-medium text-gray-300 mb-1">Setup needed</p>
          <p>Open Settings and choose an AI provider:</p>
          <div className="mt-2 space-y-1 text-[11px]">
            <p><span className="text-green-400">llama.cpp</span> — free, local</p>
            <p><span className="text-blue-400">Gemini</span> — free tier available</p>
            <p><span className="text-purple-400">OpenAI</span> — pay per use</p>
          </div>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Open Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center gap-3 px-4">
          <div className="mt-2 text-center">
            <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.105V4.875A1.875 1.875 0 015.625 3h12.75A1.875 1.875 0 0120.25 4.875v10.5A1.875 1.875 0 0118.375 17.25H7.5l-3.75 2.855z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-300">Ask about {siteName}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">AI has the full security report</p>
          </div>

          <div className="flex flex-col gap-1.5 w-full mt-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-left text-xs px-3 py-2.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-lg text-gray-300 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2.5 mb-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-200 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl rounded-bl-sm px-3 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
