<div align="center">

# SecurityCrew

### AI-powered website security auditor for everyday users

[![Chrome](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome&logoColor=white)](https://github.com/emtypyie/securitycrew)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

*No security expertise needed. Just install it and browse.*

</div>

---

## What is SecurityCrew?

SecurityCrew is a Chrome extension that **automatically scans every website you visit** and tells you if it's safe — in plain English. No complex dashboards, no jargon, no fear-mongering. Just a simple score and honest explanation.

```
  ┌─────────────────────────────────────────┐
  │  SecurityCrew                            │
  │                                         │
  │         ┌─────────┐                     │
  │         │   82    │  ← Score out of 100 │
  │         │   A     │  ← Letter grade     │
  │         └─────────┘                     │
  │                                         │
  │  [PASS] HTTPS enabled                   │
  │  [PASS] Valid certificate               │
  │  [WARN] Missing CSP header              │
  │  [PASS] Good reputation                 │
  │                                         │
  │  "This site looks safe to use.          │
  │   It has HTTPS and a valid certificate. │
  │   Consider enabling a Content           │
  │   Security Policy for better            │
  │   protection."                          │
  └─────────────────────────────────────────┘
```

---

## Features

### Safety Score

Every website gets a **0-100 score** with a letter grade:

| Score | Grade | Verdict |
|-------|-------|---------|
| 95-100 | A+ | Excellent |
| 85-94 | A | Safe |
| 70-84 | B | Good |
| 50-69 | C | Moderate risk |
| 30-49 | D | Suspicious |
| 0-29 | F | Dangerous |

### AI Summaries

Get plain-English explanations of security findings. Choose your AI provider:

| Provider | Cost | Privacy |
|----------|------|---------|
| **llama.cpp** | Free | 100% local |
| **Google Gemini** | Free tier | Google servers |
| **OpenAI** | Pay per use | OpenAI servers |

### Security Header Analysis

Checks for critical security headers and explains what each one does:

| Header | What It Does |
|--------|-------------|
| `Strict-Transport-Security` | Forces HTTPS connections |
| `Content-Security-Policy` | Prevents XSS attacks |
| `X-Frame-Options` | Prevents clickjacking |
| `X-Content-Type-Options` | Prevents MIME sniffing |
| `Referrer-Policy` | Controls referrer information |
| `Permissions-Policy` | Restricts browser features |
| `X-XSS-Protection` | Legacy XSS filter |

### Phishing Detection

Catches common phishing tricks:
- **Typosquatting** — `g00gle.com`, `amaz0n.com`
- **Homograph attacks** — Unicode characters that look like Latin
- **Suspicious TLDs** — `.xyz`, `.top`, `.buzz`
- **IP-based URLs** — `http://192.168.1.1/login`
- **URL shorteners** — `bit.ly`, `tinyurl.com`

### Domain Intelligence

- Domain age detection (new = suspicious)
- WHOIS registration info
- Certificate issuer and validity
- TLS protocol version check

### Form Guard

Warns you **before** you type sensitive data into unsafe pages:
- Password fields on HTTP sites
- Credit card forms on suspicious domains
- Login forms on newly registered domains

### AI Chat

Ask questions about any website's security:

```
You: Is this site safe to enter my password?

AI: This site scored 82/100 (Grade A). It has HTTPS
and a valid certificate, so your password would be
encrypted in transit. However, it's missing the
Content-Security-Policy header, which means it's
slightly more vulnerable to XSS attacks. Overall,
it's reasonably safe for entering a password.
```

---

## Quick Start

### Install

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

That's it. SecurityCrew will start scanning every site you visit.

### Set Up AI (Optional)

Without AI, SecurityCrew uses rule-based summaries. For AI chat:

**Option A: llama.cpp (Free, Local)**
```bash
# Install llama.cpp
# Download a GGUF model (Q4_K_M recommended)
llama-server -m model.gguf --port 8080
```

**Option B: Google Gemini (Free Tier)**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key
3. Paste in SecurityCrew Settings

**Option C: OpenAI / Compatible**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Paste in SecurityCrew Settings

### Backend Server (Optional)

Adds TLS certificate analysis and WHOIS lookups:

```bash
cd server
npm install
npm run dev
```

Server runs on `http://localhost:3000`. Set this URL in extension settings.

---

## How It Works

```
   Website Visit
        │
        ▼
   ┌─────────────┐
   │   Scan       │
   │   Headers    │──── HSTS, CSP, X-Frame-Options, etc.
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   Check     │
   │   TLS       │──── Certificate, protocol, ciphers
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   Analyze   │
   │   Domain    │──── Age, TLD, typosquatting, homographs
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   Check     │
   │   Reputation│──── Security databases
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   Detect    │
   │   Forms     │──── Passwords, credit cards
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   Calculate │
   │   Score     │──── Weighted 0-100
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   Generate  │
   │   Summary   │──── AI or rule-based
   └─────────────┘
```

All analysis runs in your browser. No data leaves your machine (except when using cloud AI providers).

---

## Score Breakdown

The final score is calculated from weighted components:

| Component | Weight | What It Checks |
|-----------|--------|----------------|
| HTTPS | 15% | Is the site encrypted? |
| TLS/SSL | 20% | Certificate validity, protocol, ciphers |
| Security Headers | 25% | Missing defense standards |
| Reputation | 15% | Known malicious/suspicious flags |
| Phishing | 10% | Domain tricks, suspicious TLD |
| Domain Age | 5% | How old is the domain? |
| Form Safety | 10% | Sensitive data on unsafe pages |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | TypeScript, React, Vite, Tailwind CSS, Manifest V3 |
| AI | llama.cpp / Gemini / OpenAI (user's choice) |
| Backend | Node.js, Express (optional) |
| Analysis | Custom engines for headers, TLS, domains, reputation |

---

## Project Structure

```
securitycrew/
├── extension/                  # Chrome Extension
│   ├── src/
│   │   │   ├── ai/             # AI provider integration
│   │   │   │   └── ai.ts       # llama.cpp, Gemini, OpenAI clients
│   │   ├── background/         # Service worker
│   │   │   └── index.ts        # Message handling, analysis orchestration
│   │   ├── components/         # React UI components
│   │   │   ├── AIChat.tsx      # AI chat interface
│   │   │   ├── DomainInfoCard.tsx
│   │   │   ├── HeaderList.tsx
│   │   │   └── ScoreGauge.tsx
│   │   ├── content/            # Form guard content script
│   │   ├── options/            # Settings page
│   │   ├── popup/              # Main popup
│   │   └── services/           # Analysis engines
│   │       ├── header-analyzer.ts
│   │       ├── tls-analyzer.ts
│   │       ├── domain-analyzer.ts
│   │       ├── reputation-checker.ts
│   │       └── form-analyzer.ts
│   └── icons/
├── server/                     # Backend API (optional)
│   └── src/routes/
│       ├── tls.ts
│       ├── whois.ts
│       └── reputation.ts
└── shared/
    ├── types/                  # Shared TypeScript types
    └── scoring/                # Security score engine
        └── engine.ts
```

---

## API Endpoints (Backend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tls?domain=` | GET | TLS certificate analysis |
| `/api/whois?domain=` | GET | Domain age and registration |
| `/api/reputation?url=` | GET | URL reputation check |
| `/api/health` | GET | Server health check |

---

## Privacy

- All analysis runs locally in your browser
- No browsing data is collected or transmitted
- AI summaries are sent only to your chosen provider
- llama.cpp keeps everything 100% on your machine

---

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT
