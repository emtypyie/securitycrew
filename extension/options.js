(function() {
  const DEFAULTS = {
    enableNotifications: true,
    enableFormGuard: true,
    backendUrl: "",
    aiProvider: "llamacpp",
    aiServerUrl: "http://localhost:8080",
    aiModel: "local-model",
    aiApiKey: "",
  };

  const FIELDS = {
    llamacpp: { urlLabel: "Server URL", urlDesc: "URL of your local llama.cpp server", urlPlaceholder: "http://localhost:8080", modelLabel: "Model", modelDesc: "Model name (auto-detected by llama.cpp)", modelPlaceholder: "local-model", needsKey: false },
    gemini: { urlLabel: "API Base URL", urlDesc: "Leave as default unless using a proxy", urlPlaceholder: "https://generativelanguage.googleapis.com", modelLabel: "Model", modelDesc: "gemini-1.5-flash (free) or gemini-1.5-pro", modelPlaceholder: "gemini-1.5-flash", needsKey: true, keyDesc: "Get a free key at aistudio.google.com" },
    openai: { urlLabel: "API Base URL", urlDesc: "Use OpenAI, Together AI, Groq, etc.", urlPlaceholder: "https://api.openai.com/v1", modelLabel: "Model", modelDesc: "e.g. gpt-4o-mini, llama-3.1-70b, mixtral-8x7b", modelPlaceholder: "gpt-4o-mini", needsKey: true, keyDesc: "Get a key from your provider's dashboard" },
  };

  let settings = { ...DEFAULTS };

  // Load
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((data) => {
    if (data) { settings = { ...DEFAULTS, ...data }; apply(); }
  });

  function apply() {
    // Toggles
    document.querySelectorAll(".toggle").forEach((btn) => {
      const key = btn.dataset.key;
      const val = !!settings[key];
      btn.className = "toggle " + (val ? "on" : "off");
      btn.onclick = () => { settings[key] = !settings[key]; apply(); };
    });

    // Text inputs
    document.querySelectorAll(".text-input[data-key]").forEach((inp) => {
      if (inp.dataset.key === "aiApiKey") return; // handled separately
      inp.value = settings[inp.dataset.key] || "";
      inp.oninput = () => { settings[inp.dataset.key] = inp.value; };
    });

    // Provider buttons
    const provider = settings.aiProvider;
    document.querySelectorAll(".provider-btn").forEach((btn) => {
      btn.className = "provider-btn" + (btn.dataset.value === provider ? " active" : "");
      btn.onclick = () => { settings.aiProvider = btn.dataset.value; apply(); };
    });

    // Dynamic fields
    const f = FIELDS[provider];
    document.getElementById("urlLabel").textContent = f.urlLabel;
    document.getElementById("urlDesc").textContent = f.urlDesc;
    document.getElementById("urlInput").placeholder = f.urlPlaceholder;
    document.getElementById("urlInput").value = settings.aiServerUrl || "";
    document.getElementById("modelLabel").textContent = f.modelLabel;
    document.getElementById("modelDesc").textContent = f.modelDesc;
    document.getElementById("modelInput").placeholder = f.modelPlaceholder;
    document.getElementById("modelInput").value = settings.aiModel || "";

    // API key
    document.getElementById("keyField").style.display = f.needsKey ? "block" : "none";
    if (f.needsKey) {
      document.getElementById("keyDesc").textContent = f.keyDesc;
      document.getElementById("keyInput").value = settings.aiApiKey || "";
    }

    // Guides
    document.getElementById("llamacppGuide").style.display = provider === "llamacpp" ? "block" : "none";
    document.getElementById("geminiGuide").style.display = provider === "gemini" ? "block" : "none";
    document.getElementById("openaiGuide").style.display = provider === "openai" ? "block" : "none";
  }

  // API key toggle
  document.getElementById("keyToggle").onclick = () => {
    const inp = document.getElementById("keyInput");
    const btn = document.getElementById("keyToggle");
    if (inp.type === "password") { inp.type = "text"; btn.textContent = "Hide"; }
    else { inp.type = "password"; btn.textContent = "Show"; }
  };
  document.getElementById("keyInput").oninput = function() { settings.aiApiKey = this.value; };

  // Copy command
  document.getElementById("copyCmd").onclick = () => {
    navigator.clipboard.writeText("llama-server -m model.gguf --port 8080");
    const btn = document.getElementById("copyCmd");
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy"; }, 2000);
  };

  // Save
  document.getElementById("saveBtn").onclick = () => {
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings }).then(() => {
      const btn = document.getElementById("saveBtn");
      btn.textContent = "Saved!";
      setTimeout(() => { btn.textContent = "Save Settings"; }, 2000);
    });
  };
})();
