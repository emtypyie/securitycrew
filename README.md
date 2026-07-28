# SecurityCrew

AI-powered Chrome extension that tells you if a website is safe — 

No security expertise needed. Just install it and browse. SecurityCrew scans every site you visit and gives you a simple safety score.

## What It Does

- **Scores every website** from 0-100 with a letter grade (A+ to F)
- **Explains risks in plain English** — no jargon, no fear-mongering
- **Warns before you enter passwords** on unsafe sites
- **Detects phishing** — typosquatting, homograph attacks, suspicious domains
- **Checks security headers** — HSTS, CSP, X-Frame-Options, and more
- **AI chat** — ask questions about any site's security

## Quick Start

### 1. Install the Extension

```bash
git clone https://github.com/emtypyie/securitycrew.git
cd securitycrew/extension
npm install
npm run build
```

Then in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select the `extension/dist/` folder

### 2. (Optional) Set Up AI

SecurityCrew works without AI — it just uses rule-based summaries. For AI-powered explanations, pick one:

| Provider | Cost | Setup |
|----------|------|-------|
| **llama.cpp** | Free | Install llama.cpp, run `llama-server -m model.gguf --port 8080` |
| **Google Gemini** | Free tier | Get API key at aistudio.google.com |
| **OpenAI** | Pay per use | Get API key at platform.openai.com |

Configure in the extension Settings (gear icon in popup).

### 3. (Optional) Start the Backend

The backend adds TLS certificate analysis, WHOIS lookups, and reputation checks.

```bash
cd server
npm install
npm run dev
```

Server runs on `http://localhost:3000`. Set this URL in extension settings.

## How It Works

SecurityCrew runs entirely in your browser. When you visit a website:

1. **Scans HTTP headers** for security standards
2. **Checks TLS certificate** validity and strength
3. **Analyzes the domain** for phishing signals
4. **Checks reputation** against security databases
5. **Detects sensitive forms** (passwords, credit cards)
6. **Calculates a score** using weighted security metrics
7. **Generates a summary** (AI or rule-based)

All analysis happens locally. No data is sent to external servers.

## Tech Stack

- **Extension**: TypeScript, React, Vite, Tailwind CSS, Manifest V3
- **AI**: llama.cpp / Gemini / OpenAI (user's choice)
- **Backend**: Node.js, Express (optional)

## Project Structure

```
securitycrew/
├── extension/              # Chrome Extension
│   ├── src/
│   │   ├── ai/             # AI provider integration
│   │   ├── background/     # Service worker
│   │   ├── components/     # UI components
│   │   ├── content/        # Form guard
│   │   ├── options/        # Settings page
│   │   ├── popup/          # Main popup
│   │   └── services/       # Analysis engines
│   └── icons/
├── server/                 # Backend API (optional)
│   └── src/routes/
└── shared/
    ├── types/              # Shared TypeScript types
    └── scoring/            # Security score engine
```

## License

MIT
