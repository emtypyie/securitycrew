# CompassCrew

An AI-powered browser extension that audits website security hygiene for everyday users.

Instead of running complex penetration tests, CompassCrew inspects public security posture signals, identifies missing defense standards, and explains risks in plain English.

## Features

### Security Header Auditor
Inspects HTTP response headers (HSTS, CSP, X-Frame-Options, etc.) and explains what's missing and why it matters.

### Phishing & Homograph Detector
Checks domain age, SSL/TLS certificate validity, and character anomalies (typosquatting like `g00gle.com`). Warns before you interact with suspicious domains.

### Plain-English Safety Scorecard
Translates technical findings into a clean 0-100 Security Health Score with a letter grade (A+ through F).

### AI Explanations
A local LLM (Llama 3.2:3B via Ollama) summarizes why a site got its score and gives actionable advice.

### Sensitive Input Guard
Detects if you're about to type passwords or credit card info into unencrypted or untrusted forms and shows a warning banner.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Manifest V3, TypeScript, React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| AI | Ollama + Llama 3.2:3B |
| APIs | Google Safe Browsing, URLHaus, WHOIS/RDAP, TLS handshake |

## Project Structure

```
compasscrew/
├── extension/          # Chrome Extension
│   ├── src/
│   │   ├── background/     # Service worker
│   │   ├── content/        # Form guard content script
│   │   ├── popup/          # React dashboard
│   │   ├── options/        # Settings page
│   │   ├── components/     # UI components
│   │   ├── services/       # Analysis engines
│   │   └── ai/             # Ollama integration
│   └── icons/
├── server/             # Backend API
│   └── src/routes/         # TLS, WHOIS, reputation endpoints
└── shared/
    ├── types/              # Shared TypeScript types
    └── scoring/            # Security score engine
```

## Setup

### Extension Only (No Backend)

1. Install dependencies:
   ```bash
   cd extension
   npm install
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer Mode**
   - Click **Load Unpacked**
   - Select `extension/dist/`

### With Backend

1. Start the server:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. The server runs on `http://localhost:3000`. Configure the URL in extension settings.

### With AI (Ollama)

1. Install [Ollama](https://ollama.ai)
2. Pull the model:
   ```bash
   ollama pull llama3.2:3b
   ```
3. The extension auto-connects to `http://localhost:11434`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tls?domain=` | GET | TLS certificate analysis |
| `/api/whois?domain=` | GET | Domain age and registration info |
| `/api/reputation?url=` | GET | URL reputation from multiple sources |
| `/api/health` | GET | Server health check |

## License

MIT
