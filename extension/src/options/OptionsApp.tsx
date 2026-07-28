import { useState, useEffect } from "react";
import type { ExtensionSettings, AIProvider } from "@shared/types";

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

const PROVIDERS: { value: AIProvider; label: string; description: string }[] = [
  { value: "llamacpp", label: "llama.cpp (Local)", description: "Free, runs on your machine" },
  { value: "gemini", label: "Google Gemini", description: "Free tier available" },
  { value: "openai", label: "OpenAI / Compatible", description: "GPT-4o, Together, Groq, etc." },
];

const PROVIDER_FIELDS: Record<AIProvider, { url: { label: string; placeholder: string; description: string }; model: { label: string; placeholder: string; description: string }; needsKey: boolean }> = {
  llamacpp: {
    url: { label: "Server URL", placeholder: "http://localhost:8080", description: "URL of your local llama.cpp server" },
    model: { label: "Model", placeholder: "local-model", description: "Model name (auto-detected by llama.cpp)" },
    needsKey: false,
  },
  gemini: {
    url: { label: "API Base URL", placeholder: "https://generativelanguage.googleapis.com", description: "Leave as default unless using a proxy" },
    model: { label: "Model", placeholder: "gemini-1.5-flash", description: "gemini-1.5-flash (free) or gemini-1.5-pro" },
    needsKey: true,
  },
  openai: {
    url: { label: "API Base URL", placeholder: "https://api.openai.com/v1", description: "Use OpenAI, Together AI, Groq, etc." },
    model: { label: "Model", placeholder: "gpt-4o-mini", description: "e.g. gpt-4o-mini, llama-3.1-70b, mixtral-8x7b" },
    needsKey: true,
  },
};

export default function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((data) => {
      if (data) setSettings(data);
    });
  }, []);

  const save = async () => {
    await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const copyCommand = () => {
    navigator.clipboard.writeText("llama-server -m model.gguf --port 8080");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providerFields = PROVIDER_FIELDS[settings.aiProvider];

  return (
    <div className="bg-gray-950 text-white min-h-screen p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">SecurityCrew Settings</h1>

      <div className="space-y-6">
        <Section title="Protection">
          <Toggle
            label="Enable Notifications"
            description="Show alerts for dangerous sites"
            checked={settings.enableNotifications}
            onChange={(v) => update("enableNotifications", v)}
          />
          <Toggle
            label="Form Guard"
            description="Warn when entering sensitive data on unsafe pages"
            checked={settings.enableFormGuard}
            onChange={(v) => update("enableFormGuard", v)}
          />
          <Toggle
            label="Educational Mode"
            description="Show explanations instead of just header names"
            checked={settings.educationalMode}
            onChange={(v) => update("educationalMode", v)}
          />
        </Section>

        <Section title="Backend Server">
          <TextInput
            label="Backend URL"
            description="URL of the Node.js backend (leave empty for extension-only mode)"
            value={settings.backendUrl}
            onChange={(v) => update("backendUrl", v)}
            placeholder="http://localhost:3000"
          />
        </Section>

        <Section title="AI Configuration">
          <div className="space-y-2">
            <p className="text-sm font-medium">Provider</p>
            <p className="text-xs text-gray-500 mb-2">Choose how AI analysis is powered</p>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update("aiProvider", p.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    settings.aiProvider === p.value
                      ? "bg-blue-900/30 border-blue-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[11px] text-gray-400">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          <TextInput
            label={providerFields.url.label}
            description={providerFields.url.description}
            value={settings.aiServerUrl}
            onChange={(v) => update("aiServerUrl", v)}
            placeholder={providerFields.url.placeholder}
          />

          <TextInput
            label={providerFields.model.label}
            description={providerFields.model.description}
            value={settings.aiModel}
            onChange={(v) => update("aiModel", v)}
            placeholder={providerFields.model.placeholder}
          />

          {providerFields.needsKey && (
            <div>
              <p className="text-sm font-medium">API Key</p>
              <p className="text-xs text-gray-500 mb-2">
                {settings.aiProvider === "gemini"
                  ? "Get a free key at aistudio.google.com"
                  : "Get a key from your provider's dashboard"}
              </p>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.aiApiKey}
                  onChange={(e) => update("aiApiKey", e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 pr-16 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-white px-2 py-1"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {settings.aiProvider === "llamacpp" && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-300">Quick Start</p>
              <p className="text-xs text-gray-400">1. Install llama.cpp from github.com/ggerganov/llama.cpp</p>
              <p className="text-xs text-gray-400">2. Download a GGUF model (Q4_K_M recommended)</p>
              <p className="text-xs text-gray-400">3. Run this command:</p>
              <div className="flex items-center gap-2 bg-gray-900 rounded px-2 py-1.5">
                <code className="text-[11px] text-blue-300 flex-1">llama-server -m model.gguf --port 8080</code>
                <button
                  onClick={copyCommand}
                  className="text-[11px] text-gray-400 hover:text-white shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-gray-500">The extension auto-connects once the server is running.</p>
            </div>
          )}

          {settings.aiProvider === "gemini" && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
              <p className="font-medium text-gray-300 mb-1">Setup</p>
              <p>1. Go to <span className="text-blue-300">aistudio.google.com</span></p>
              <p>2. Click "Get API Key"</p>
              <p>3. Paste the key above</p>
              <p className="mt-1 text-gray-500">Free tier: 15 RPM, 1M tokens/day</p>
            </div>
          )}

          {settings.aiProvider === "openai" && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
              <p className="font-medium text-gray-300 mb-1">Compatible Providers</p>
              <p>OpenAI, Together AI, Groq, DeepSeek, OpenRouter, etc.</p>
              <p className="mt-1">Set the API Base URL to match your provider.</p>
            </div>
          )}
        </Section>

        <button
          onClick={save}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors"
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-3 bg-gray-900 border border-gray-800 rounded-lg p-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${
          checked ? "bg-blue-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function TextInput({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
