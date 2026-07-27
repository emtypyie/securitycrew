import { useState, useEffect } from "react";
import type { ExtensionSettings } from "@shared/types";

const DEFAULT_SETTINGS: ExtensionSettings = {
  enableNotifications: true,
  enableFormGuard: true,
  educationalMode: false,
  backendUrl: "",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2:3b",
};

export default function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="bg-gray-950 text-white min-h-screen p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">CompassCrew Settings</h1>

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
          <TextInput
            label="Ollama URL"
            description="URL of your local Ollama instance"
            value={settings.ollamaUrl}
            onChange={(v) => update("ollamaUrl", v)}
            placeholder="http://localhost:11434"
          />
          <TextInput
            label="Model"
            description="Ollama model to use for explanations"
            value={settings.ollamaModel}
            onChange={(v) => update("ollamaModel", v)}
            placeholder="llama3.2:3b"
          />
        </Section>

        <button
          onClick={save}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors"
        >
          {saved ? "✓ Saved!" : "Save Settings"}
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
