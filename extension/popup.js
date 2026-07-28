(function() {
  let report = null;
  let history = [];
  let aiAvailable = false;
  let chatMessages = [];
  let chatLoading = false;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // --- Init ---
  chrome.runtime.sendMessage({ type: "CHECK_AI_SERVER" }).then((r) => {
    aiAvailable = r?.available ?? false;
    updateAIBadge();
  }).catch(() => { aiAvailable = false; updateAIBadge(); });

  chrome.runtime.sendMessage({ type: "GET_HISTORY" }).then((d) => {
    history = d || [];
  }).catch(() => {});

  analyzeTab();

  // --- Settings ---
  $("#settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#retryBtn").addEventListener("click", analyzeTab);
  $("#scanBtn").addEventListener("click", analyzeTab);

  // --- Tabs ---
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      $$(".tab-panel").forEach((p) => { p.style.display = "none"; p.classList.remove("active"); });
      const panel = $("#" + btn.dataset.tab + "Tab");
      panel.style.display = "block";
      panel.classList.add("active");
      if (btn.dataset.tab === "chat") renderChat();
    });
  });

  // --- Analyze ---
  async function analyzeTab() {
    showState("loading");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab.url.startsWith("http")) {
        showError("Navigate to a website to check its security.");
        return;
      }
      const resp = await Promise.race([
        chrome.runtime.sendMessage({ type: "ANALYZE_URL", url: tab.url, tabId: tab.id }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
      ]);
      if (resp) {
        report = resp;
        showState("score");
        renderScore();
        renderDetails();
      } else {
        showError("Something went wrong. Try again.");
      }
    } catch {
      showError("Something went wrong. Try again.");
    }
  }

  function showState(state) {
    $("#loadingState").style.display = state === "loading" ? "flex" : "none";
    $("#errorState").style.display = state === "error" ? "flex" : "none";
    const showReport = state === "score";
    $("#tabsBar").style.display = showReport ? "flex" : "none";
    ["scoreTab", "detailsTab", "chatTab"].forEach((id) => {
      const el = $("#" + id);
      if (showReport) {
        el.style.display = id === "scoreTab" ? "block" : "none";
        el.classList.toggle("active", id === "scoreTab");
      } else {
        el.style.display = "none";
        el.classList.remove("active");
      }
    });
    $$(".tab").forEach((t) => t.classList.remove("active"));
    if (showReport) $$(".tab")[0].classList.add("active");
  }

  function showError(msg) {
    showState("error");
    $("#errorText").textContent = msg;
  }

  // --- Score ---
  function renderScore() {
    if (!report) return;
    const s = report.score;
    const color = s.total >= 80 ? "#22c55e" : s.total >= 60 ? "#eab308" : s.total >= 30 ? "#f97316" : "#ef4444";
    const circ = 2 * Math.PI * 42;
    const offset = circ - (s.total / 100) * circ;

    $("#urlBar").textContent = report.url;
    const fill = $("#gaugeFill");
    fill.setAttribute("stroke", color);
    fill.style.strokeDashoffset = offset;
    $("#gaugeScore").textContent = s.total;
    $("#gaugeScore").style.color = color;
    $("#gaugeGrade").textContent = s.grade;

    // Risk
    const riskMap = {
      safe: { text: "Looks Safe", cls: "green" },
      moderate: { text: "Use Caution", cls: "yellow" },
      suspicious: { text: "Suspicious", cls: "orange" },
      dangerous: { text: "Dangerous", cls: "red" },
    };
    const r = riskMap[s.riskLevel] || riskMap.safe;
    $("#riskRow").innerHTML = '<span class="risk-label" style="color:' + (r.cls === "green" ? "#4ade80" : r.cls === "yellow" ? "#facc15" : r.cls === "orange" ? "#fb923c" : "#f87171") + '">' + r.text + '</span>';

    // Stats
    const hCount = report.headers.filter((h) => h.present).length;
    $("#statGrid").innerHTML =
      statCard("HTTPS", report.https ? "Yes" : "No", report.https) +
      statCard("Certificate", report.tls.valid ? "Valid" : "Invalid", report.tls.valid) +
      statCard("Headers", hCount + "/" + report.headers.length, hCount > 4) +
      statCard("Reputation", report.reputation.status, report.reputation.status === "safe");

    // Summary
    if (report.aiSummary) {
      $("#summaryBox").style.display = "block";
      $("#summaryTitle").textContent = aiAvailable ? "AI Summary" : "Summary";
      $("#summaryText").textContent = report.aiSummary;
    } else {
      $("#summaryBox").style.display = "none";
    }

    // Breakdown
    if (s.breakdown) {
      $("#breakdownBox").style.display = "block";
      const items = [
        { label: "HTTPS", score: s.breakdown.https },
        { label: "TLS/SSL", score: s.breakdown.tls },
        { label: "Headers", score: s.breakdown.headers },
        { label: "Reputation", score: s.breakdown.reputation },
        { label: "Phishing", score: s.breakdown.phishing },
        { label: "Forms", score: s.breakdown.formSafety },
      ];
      $("#breakdownBars").innerHTML = items.map((item) => {
        const cls = item.score >= 80 ? "green" : item.score >= 50 ? "yellow" : item.score >= 25 ? "orange" : "red";
        return '<div class="bar-row"><span class="bar-label">' + item.label + '</span><div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + item.score + '%"></div></div><span class="bar-value">' + item.score + '</span></div>';
      }).join("");
    } else {
      $("#breakdownBox").style.display = "none";
    }
  }

  function statCard(label, value, good) {
    return '<div class="stat-card"><div class="label">' + label + '</div><div class="value ' + (good ? "good" : "bad") + '">' + value + '</div></div>';
  }

  // --- Refresh Summary ---
  $("#refreshSummary").addEventListener("click", async () => {
    if (!report) return;
    const btn = $("#refreshSummary");
    btn.disabled = true;
    btn.textContent = "...";
    try {
      const resp = await chrome.runtime.sendMessage({ type: "REFRESH_AI", url: report.url });
      if (resp) { report = resp; renderScore(); }
    } catch {}
    btn.disabled = false;
    btn.textContent = "Refresh";
  });

  // --- Details ---
  function renderDetails() {
    if (!report) return;
    renderHeaders();
    renderDomain();
    renderHistory();
  }

  function renderHeaders() {
    const h = report.headers;
    const count = h.filter((x) => x.present).length;
    let html = '<div class="section-title">' + count + ' of ' + h.length + ' security headers detected</div>';
    h.forEach((hdr) => {
      const cls = hdr.present ? "present" : (hdr.severity === "high" || hdr.severity === "critical") ? "missing-high" : "missing-low";
      const dotCls = hdr.present ? "green" : "red";
      let extra = "";
      if (!hdr.present) extra = '<div class="header-rec">' + hdr.recommendation + '</div>';
      if (hdr.present && hdr.value) extra = '<div class="header-value">' + esc(hdr.value) + '</div>';
      html += '<div class="header-item ' + cls + '"><div class="header-top"><div class="header-name-row"><span class="dot ' + dotCls + '"></span><span class="header-name">' + esc(hdr.name) + '</span></div><span class="severity-badge ' + hdr.severity + '">' + hdr.severity + '</span></div><div class="header-desc">' + esc(hdr.description) + '</div>' + extra + '</div>';
    });
    $("#headersList").innerHTML = html;
  }

  function renderDomain() {
    const d = report.domain;
    const t = report.tls;
    const rp = report.reputation;
    let html = "";

    // Domain
    html += '<div class="info-card"><div class="card-title">Domain</div><div class="domain-name">' + esc(d.domain) + '</div>';
    if (d.ageDays !== undefined) {
      html += '<div class="info-row" style="margin-top:4px"><span class="k">Age</span><span class="v">' + (d.ageDays > 365 ? Math.floor(d.ageDays / 365) + " years" : d.ageDays + " days") + '</span></div>';
    }
    html += "</div>";

    // TLS
    html += '<div class="info-card"><div class="card-title">TLS Certificate</div>';
    html += infoRow("Valid", t.valid ? "Yes" : "No", t.valid);
    if (t.issuer) html += infoRow("Issuer", t.issuer);
    if (t.protocol) html += infoRow("Protocol", t.protocol);
    if (t.daysUntilExpiry !== undefined) html += infoRow("Expires in", t.daysUntilExpiry + " days", t.daysUntilExpiry > 30);
    if (t.selfSigned) html += infoRow("Warning", "Self-signed certificate", false);
    if (t.weakCipher) html += infoRow("Warning", "Weak cipher detected", false);
    html += "</div>";

    // Phishing
    html += '<div class="info-card"><div class="card-title">Phishing Indicators</div>';
    html += indicatorRow("Suspicious TLD", d.suspiciousTLD);
    html += indicatorRow("Typosquatting", d.typosquatting);
    html += indicatorRow("Homograph Attack", d.homographAttack);
    html += indicatorRow("IP-based URL", d.ipBasedURL);
    html += indicatorRow("Excessive Subdomains", d.excessiveSubdomains);
    html += indicatorRow("URL Shortener", d.urlShortener);
    html += "</div>";

    // Reputation
    html += '<div class="info-card"><div class="card-title">Reputation</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="rep-dot ' + rp.status + '"></span><span style="font-size:14px;font-weight:500;text-transform:capitalize">' + rp.status + '</span></div>';
    rp.sources.forEach((src) => {
      const c = src.status === "safe" ? "#4ade80" : src.status === "suspicious" ? "#facc15" : src.status === "malicious" ? "#f87171" : "#9ca3af";
      html += '<div class="info-row"><span class="k">' + esc(src.name) + '</span><span style="color:' + c + ';text-transform:capitalize;font-size:12px">' + src.status + '</span></div>';
    });
    html += "</div>";

    $("#domainSection").innerHTML = '<div class="section-gap">' + html + '</div>';
  }

  function renderHistory() {
    if (history.length === 0) { $("#historySection").innerHTML = ""; return; }
    let html = '<div class="section-gap"><div class="section-title">Recent Scans</div>';
    history.slice(0, 10).forEach((e) => {
      let hostname = e.url;
      try { hostname = new URL(e.url).hostname; } catch {}
      html += '<div class="history-item"><span class="history-host">' + esc(hostname) + '</span><span class="history-score ' + e.riskLevel + '">' + e.score + '</span></div>';
    });
    html += "</div>";
    $("#historySection").innerHTML = html;
  }

  function infoRow(label, value, good) {
    const cls = good === undefined ? "" : good ? " good" : " bad";
    return '<div class="info-row"><span class="k">' + label + '</span><span class="v' + cls + '">' + esc(value) + '</span></div>';
  }

  function indicatorRow(label, detected) {
    return '<div class="indicator-row"><span class="k">' + label + '</span>' + (detected ? '<span class="detected">! Detected</span>' : '<span class="clean">Clean</span>') + '</div>';
  }

  // --- AI Badge ---
  function updateAIBadge() {
    const badge = $("#aiBadge");
    badge.style.display = "inline";
    badge.className = "ai-badge " + (aiAvailable ? "on" : "off");
    badge.textContent = aiAvailable ? "AI" : "No AI";
  }

  // --- Chat ---
  function renderChat() {
    const container = $("#chatTab");
    if (!aiAvailable) {
      container.innerHTML = '<div class="chat-empty">' +
        '<div class="chat-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg></div>' +
        '<div><div class="title">AI Chat</div><div class="sub">Ask questions about this site\'s security</div></div>' +
        '<div class="setup-card"><div class="stitle">Setup needed</div><div>Open Settings and choose an AI provider:</div>' +
        '<div class="provider"><span class="p-name p-llama">llama.cpp</span> &mdash; free, local</div>' +
        '<div class="provider"><span class="p-name p-gemini">Gemini</span> &mdash; free tier available</div>' +
        '<div class="provider"><span class="p-name p-openai">OpenAI</span> &mdash; pay per use</div></div>' +
        '<button class="setup-link" id="chatSetupLink">Open Settings</button></div>';
      $("#chatSetupLink").addEventListener("click", () => chrome.runtime.openOptionsPage());
      return;
    }

    let html = '<div class="chat-wrap">';
    html += '<div class="chat-messages" id="chatMessages"></div>';
    html += '<div class="chat-input-row"><input class="chat-input" id="chatInput" placeholder="Ask about ' + esc(report.domain.domain) + '..." /><button class="send-btn" id="chatSend">Send</button></div>';
    html += "</div>";
    container.innerHTML = html;

    $("#chatSend").addEventListener("click", () => sendChat());
    $("#chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

    if (chatMessages.length === 0) {
      renderChatEmpty();
    } else {
      renderChatMessages();
    }
  }

  function renderChatEmpty() {
    const site = report.domain.domain;
    const questions = ["Is this site safe?", "What's wrong with this site?", "Should I enter my password here?", "How can I stay safe on this site?"];
    let html = '<div class="chat-empty" style="padding-top:8px">';
    html += '<div class="chat-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.105V4.875A1.875 1.875 0 015.625 3h12.75A1.875 1.875 0 0120.25 4.875v10.5A1.875 1.875 0 0118.375 17.25H7.5l-3.75 2.855z"/></svg></div>';
    html += '<div class="title">Ask about ' + esc(site) + '</div><div class="sub">AI has the full security report</div>';
    html += '<div class="quick-list">';
    questions.forEach((q) => { html += '<button class="quick-btn" data-q="' + esc(q) + '">' + esc(q) + '</button>'; });
    html += "</div></div>";
    $("#chatMessages").innerHTML = html;
    $$(".quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => sendChat(btn.dataset.q));
    });
  }

  function renderChatMessages() {
    const box = $("#chatMessages");
    if (!box) return;
    let html = "";
    chatMessages.forEach((m) => {
      const cls = m.role === "user" ? "user" : "assistant";
      html += '<div class="msg ' + cls + '"><div class="msg-bubble">' + esc(m.content) + '</div></div>';
    });
    if (chatLoading) {
      html += '<div class="msg assistant"><div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>';
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  async function sendChat(text) {
    const input = $("#chatInput");
    const msg = text || (input ? input.value.trim() : "");
    if (!msg || chatLoading) return;
    if (input) input.value = "";
    chatMessages.push({ role: "user", content: msg });
    chatLoading = true;
    renderChatMessages();
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "CHAT_AI",
        messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
        report,
      });
      chatMessages.push({ role: "assistant", content: resp?.reply || "No response." });
    } catch {
      chatMessages.push({ role: "assistant", content: "AI is not available. Check your settings." });
    }
    chatLoading = false;
    renderChatMessages();
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
})();
